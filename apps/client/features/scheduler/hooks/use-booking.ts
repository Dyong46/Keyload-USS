"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { v4 as uuidv4 } from "uuid"

import { toast } from "@/components/ui/toast"
import {
  schedulerApi,
  schedulerQueryKeys,
  type ApiAppointment,
  type AvailabilityParams,
  type CreateAppointmentRequest,
} from "@/features/scheduler/api/scheduler-api"
import { ApiError } from "@/lib/api"

type UseBookingOptions = {
  availabilityParams?: AvailabilityParams
  onCreated: (appointment: ApiAppointment) => void
  onRecoverableConflict: () => void
}

type ActiveRequest = {
  fingerprint: string
  idempotencyKey: string
}

function canonicalFingerprint(body: CreateAppointmentRequest): string {
  return JSON.stringify({
    ...body,
    serviceIds: [...body.serviceIds].sort(),
    scheduledStart: new Date(body.scheduledStart).toISOString(),
  })
}

function apiErrorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined
  if (typeof error.data !== "object" || error.data === null) return undefined
  if (!("code" in error.data) || typeof error.data.code !== "string") {
    return undefined
  }
  return error.data.code
}

function bookingErrorMessage(error: unknown): string {
  const code = apiErrorCode(error)
  const recoverableCodes = new Set([
    "RESOURCE_CONFLICT",
    "VEHICLE_CONFLICT",
    "CONFIRMATION_TOO_LATE",
  ])
  if (code && recoverableCodes.has(code)) {
    return "Availability changed. Choose an available time and try again."
  }
  return error instanceof Error ? error.message : "Unexpected error"
}

export function useBooking({
  availabilityParams,
  onCreated,
  onRecoverableConflict,
}: UseBookingOptions) {
  const queryClient = useQueryClient()
  const activeRequest = React.useRef<ActiveRequest | undefined>(undefined)
  const availabilityQuery = useQuery({
    queryKey: availabilityParams
      ? schedulerQueryKeys.availability(availabilityParams)
      : schedulerQueryKeys.availabilityRoot,
    queryFn: ({ signal }) =>
      schedulerApi.availability(availabilityParams!, signal),
    enabled: Boolean(availabilityParams),
    staleTime: 0,
  })
  const createMutation = useMutation({
    mutationFn: (body: CreateAppointmentRequest) => {
      const fingerprint = canonicalFingerprint(body)
      if (activeRequest.current?.fingerprint !== fingerprint) {
        activeRequest.current = {
          fingerprint,
          idempotencyKey: uuidv4(),
        }
      }
      const request = schedulerApi.createAppointment(
        body,
        activeRequest.current.idempotencyKey
      )
      return toast.promise(request, {
        loading: {
          type: "loading",
          title: "Creating appointment",
          description: "Checking resources and saving the booking…",
          timeout: 0,
        },
        success: {
          type: "success",
          title: "Appointment created",
          description: "The booking was saved successfully.",
          timeout: 5000,
        },
        error: (error) => ({
          type: "error",
          title: "Could not create appointment",
          description: bookingErrorMessage(error),
          priority: "high",
          timeout: 7000,
        }),
      })
    },
    onSuccess: (appointment) => {
      activeRequest.current = undefined
      void queryClient.invalidateQueries({
        queryKey: schedulerQueryKeys.appointmentsRoot,
      })
      onCreated(appointment)
    },
    onError: (error) => {
      const code = apiErrorCode(error)
      const recoverableCodes = new Set([
        "RESOURCE_CONFLICT",
        "VEHICLE_CONFLICT",
        "CONFIRMATION_TOO_LATE",
      ])
      if (code && recoverableCodes.has(code)) {
        void queryClient.invalidateQueries({
          queryKey: schedulerQueryKeys.availabilityRoot,
        })
        onRecoverableConflict()
      }
    },
  })

  return {
    availabilityQuery,
    confirmAppointment: (body: CreateAppointmentRequest) =>
      createMutation.mutate(body),
    isConfirming: createMutation.isPending,
  }
}
