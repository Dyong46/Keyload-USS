"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { toast } from "@/components/ui/toast"
import {
  schedulerApi,
  schedulerQueryKeys,
  type ApiAppointment,
  type ApiAppointmentList,
  type AppointmentListParams,
} from "@/features/scheduler/api/scheduler-api"

export type AppointmentAction = "cancel" | "complete"

type AppointmentMutation = {
  id: string
  action: AppointmentAction
}

function replaceAppointment(
  data: ApiAppointmentList | undefined,
  appointment: ApiAppointment
): ApiAppointmentList | undefined {
  if (!data?.items.some((item) => item.id === appointment.id)) return data
  return {
    ...data,
    items: data.items.map((item) =>
      item.id === appointment.id ? appointment : item
    ),
  }
}

export function useAppointments(params: AppointmentListParams) {
  const queryClient = useQueryClient()
  const appointmentsQuery = useQuery({
    queryKey: schedulerQueryKeys.appointments(params),
    queryFn: ({ signal }) => schedulerApi.appointments(params, signal),
  })
  const actionMutation = useMutation({
    mutationFn: ({ id, action }: AppointmentMutation) =>
      action === "cancel"
        ? schedulerApi.cancelAppointment(id)
        : schedulerApi.completeAppointment(id),
    onSuccess: (appointment, variables) => {
      queryClient.setQueriesData<ApiAppointmentList>(
        { queryKey: schedulerQueryKeys.appointmentsRoot },
        (data) => replaceAppointment(data, appointment)
      )
      void queryClient.invalidateQueries({
        queryKey: schedulerQueryKeys.appointmentsRoot,
      })
      toast.add({
        type: "success",
        title:
          variables.action === "cancel"
            ? "Appointment cancelled"
            : "Service completed",
        description:
          variables.action === "cancel"
            ? "The remaining technician and service bay time is now available."
            : "The appointment was completed and its remaining time was released.",
      })
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Could not update appointment",
        description: error.message,
        priority: "high",
      })
    },
  })

  return {
    appointmentsQuery,
    runAction: (id: string, action: AppointmentAction) =>
      actionMutation.mutate({ id, action }),
    pendingAction: actionMutation.isPending
      ? actionMutation.variables
      : undefined,
  }
}
