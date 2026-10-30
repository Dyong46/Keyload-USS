"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, Pencil, Plus, RefreshCw } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import {
  schedulerApi,
  schedulerQueryKeys,
  type ApiServiceType,
  type CreateServiceTypeRequest,
} from "@/features/scheduler/api/scheduler-api"

const serviceTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  durationMinutes: z
    .number({ error: "Duration is required" })
    .int("Use whole minutes")
    .min(1, "Minimum duration is 1 minute")
    .max(540, "Maximum duration is 540 minutes"),
})

type ServiceTypeForm = z.infer<typeof serviceTypeSchema>

export function ServiceTypesManagement() {
  const queryClient = useQueryClient()
  const [editor, setEditor] = React.useState<
    { serviceType?: ApiServiceType } | undefined
  >()
  const serviceTypesQuery = useQuery({
    queryKey: schedulerQueryKeys.serviceTypes,
    queryFn: ({ signal }) => schedulerApi.serviceTypes(signal),
  })
  const saveMutation = useMutation({
    mutationFn: ({
      serviceType,
      values,
    }: {
      serviceType?: ApiServiceType
      values: CreateServiceTypeRequest
    }) =>
      serviceType
        ? schedulerApi.updateServiceType(serviceType.id, values)
        : schedulerApi.createServiceType(values),
    onSuccess: (serviceType, variables) => {
      void queryClient.invalidateQueries({
        queryKey: schedulerQueryKeys.serviceTypes,
      })
      setEditor(undefined)
      toast.add({
        type: "success",
        title: variables.serviceType
          ? "Service type updated"
          : "Service type created",
        description: `${serviceType.name} · ${serviceType.durationMinutes} minutes`,
      })
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Could not save service type",
        description: error.message,
        priority: "high",
      })
    },
  })
  const serviceTypes = serviceTypesQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Service types</h1>
          <p className="text-sm text-slate-500">
            Maintain service names and fixed booking durations.
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setEditor({})}
        >
          <Plus /> New service type
        </Button>
      </div>

      <section className="overflow-hidden rounded-xl border bg-white">
        {serviceTypesQuery.isError ? (
          <div className="grid place-items-center gap-2 p-12 text-sm text-red-700">
            Service types could not be loaded.
            <Button
              variant="outline"
              size="sm"
              onClick={() => void serviceTypesQuery.refetch()}
            >
              <RefreshCw /> Retry
            </Button>
          </div>
        ) : serviceTypesQuery.isPending ? (
          <div className="flex justify-center gap-2 p-12 text-sm text-slate-500">
            <LoaderCircle className="size-4 animate-spin" /> Loading service
            types…
          </div>
        ) : serviceTypes.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2">Service type</th>
                  <th className="px-4 py-2">Duration</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {serviceTypes.map((serviceType) => (
                  <tr key={serviceType.id} className="border-t">
                    <td className="px-4 py-3 font-medium">
                      {serviceType.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {serviceType.durationMinutes} minutes
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditor({ serviceType })}
                      >
                        <Pencil /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-12 text-center text-sm text-slate-500">
            No service types configured.
          </p>
        )}
      </section>

      {editor && (
        <ServiceTypeEditor
          serviceType={editor.serviceType}
          pending={saveMutation.isPending}
          onClose={() => setEditor(undefined)}
          onSave={(values) =>
            saveMutation.mutateAsync({ serviceType: editor.serviceType, values })
          }
        />
      )}
    </div>
  )
}

function ServiceTypeEditor({
  serviceType,
  pending,
  onClose,
  onSave,
}: {
  serviceType?: ApiServiceType
  pending: boolean
  onClose: () => void
  onSave: (values: ServiceTypeForm) => Promise<ApiServiceType>
}) {
  const form = useForm<ServiceTypeForm>({
    resolver: zodResolver(serviceTypeSchema),
    defaultValues: {
      name: serviceType?.name ?? "",
      durationMinutes: serviceType?.durationMinutes ?? 30,
    },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {serviceType ? "Update service type" : "Create service type"}
          </DialogTitle>
          <DialogDescription>
            Updated values apply to future bookings. Existing appointments keep
            their saved service snapshots.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await onSave(values)
            } catch {
              return
            }
          })}
        >
          <label className="block space-y-1.5 text-sm font-medium">
            <span>Name</span>
            <Input {...form.register("name")} autoFocus />
            {form.formState.errors.name?.message && (
              <span className="block text-xs text-red-600">
                {form.formState.errors.name.message}
              </span>
            )}
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            <span>Duration (minutes)</span>
            <Input
              type="number"
              min={1}
              max={540}
              {...form.register("durationMinutes", { valueAsNumber: true })}
            />
            {form.formState.errors.durationMinutes?.message && (
              <span className="block text-xs text-red-600">
                {form.formState.errors.durationMinutes.message}
              </span>
            )}
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />}
              {serviceType ? "Save changes" : "Create service type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
