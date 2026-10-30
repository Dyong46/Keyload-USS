"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
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
  type ApiTechnicianManagement,
  type CreateTechnicianRequest,
} from "@/features/scheduler/api/scheduler-api"
import { NativeSelect } from "@/features/scheduler/components/scheduler-fields"

const technicianSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
})

const createTechnicianSchema = technicianSchema.extend({
  dealershipId: z.string().uuid("Select a dealership"),
  serviceTypeIds: z.array(z.string().uuid()),
})

export function TechniciansManagement() {
  const queryClient = useQueryClient()
  const [dealershipId, setDealershipId] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editingTechnician, setEditingTechnician] =
    React.useState<ApiTechnicianManagement>()
  const [qualificationTechnicianId, setQualificationTechnicianId] =
    React.useState<string>()
  const dealershipsQuery = useQuery({
    queryKey: schedulerQueryKeys.dealerships,
    queryFn: ({ signal }) => schedulerApi.dealerships(signal),
  })
  const serviceTypesQuery = useQuery({
    queryKey: schedulerQueryKeys.serviceTypes,
    queryFn: ({ signal }) => schedulerApi.serviceTypes(signal),
  })
  const techniciansQuery = useQuery({
    queryKey: schedulerQueryKeys.technicians(dealershipId || undefined),
    queryFn: ({ signal }) =>
      schedulerApi.technicians(dealershipId || undefined, signal),
  })
  const createMutation = useMutation({
    mutationFn: (body: CreateTechnicianRequest) =>
      schedulerApi.createTechnician(body),
    onSuccess: (technician) => {
      void queryClient.invalidateQueries({
        queryKey: schedulerQueryKeys.techniciansRoot,
      })
      setCreateOpen(false)
      toast.add({
        type: "success",
        title: "Technician created",
        description: `${technician.name} · ${technician.dealership.name}`,
      })
    },
    onError: (error) => showSaveError("Could not create technician", error),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      schedulerApi.updateTechnician(id, name),
    onSuccess: (technician) => {
      updateTechnicianCaches(queryClient, technician)
      void queryClient.invalidateQueries({
        queryKey: schedulerQueryKeys.appointmentsRoot,
      })
      setEditingTechnician(undefined)
      toast.add({
        type: "success",
        title: "Technician updated",
        description: technician.name,
      })
    },
    onError: (error) => showSaveError("Could not update technician", error),
  })
  const qualificationMutation = useMutation({
    mutationFn: ({
      technicianId,
      serviceTypeId,
      attach,
    }: {
      technicianId: string
      serviceTypeId: string
      attach: boolean
    }) =>
      attach
        ? schedulerApi.attachTechnicianServiceType(
            technicianId,
            serviceTypeId
          )
        : schedulerApi.detachTechnicianServiceType(
            technicianId,
            serviceTypeId
          ),
    onSuccess: (technician, variables) => {
      updateTechnicianCaches(queryClient, technician)
      void queryClient.invalidateQueries({
        queryKey: schedulerQueryKeys.availabilityRoot,
      })
      toast.add({
        type: "success",
        title: variables.attach ? "Qualification attached" : "Qualification removed",
        description: `${technician.name} · future availability updated`,
      })
    },
    onError: (error) => showSaveError("Could not update qualification", error),
  })
  const technicians = techniciansQuery.data ?? []
  const qualificationTechnician = technicians.find(
    ({ id }) => id === qualificationTechnicianId
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Technicians</h1>
          <p className="text-sm text-slate-500">
            Create technicians and maintain service qualifications.
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setCreateOpen(true)}
        >
          <Plus /> New technician
        </Button>
      </div>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="max-w-sm border-b p-3">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Dealership
          </label>
          <NativeSelect
            ariaLabel="Filter technicians by dealership"
            value={dealershipId}
            onChange={setDealershipId}
          >
            <option value="">All dealerships</option>
            {(dealershipsQuery.data ?? []).map((dealership) => (
              <option key={dealership.id} value={dealership.id}>
                {dealership.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        {techniciansQuery.isError ? (
          <div className="grid place-items-center gap-2 p-12 text-sm text-red-700">
            Technicians could not be loaded.
            <Button
              variant="outline"
              size="sm"
              onClick={() => void techniciansQuery.refetch()}
            >
              <RefreshCw /> Retry
            </Button>
          </div>
        ) : techniciansQuery.isPending ? (
          <div className="flex justify-center gap-2 p-12 text-sm text-slate-500">
            <LoaderCircle className="size-4 animate-spin" /> Loading
            technicians…
          </div>
        ) : technicians.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2">Technician</th>
                  <th className="px-4 py-2">Dealership</th>
                  <th className="px-4 py-2">Qualified services</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {technicians.map((technician) => (
                  <tr key={technician.id} className="border-t align-top">
                    <td className="px-4 py-3 font-medium">{technician.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {technician.dealership.name}
                    </td>
                    <td className="max-w-lg px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {technician.serviceTypes.length ? (
                          technician.serviceTypes.map((serviceType) => (
                            <Badge key={serviceType.id} variant="secondary">
                              {serviceType.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-amber-700">
                            No service qualification
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTechnician(technician)}
                        >
                          <Pencil /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setQualificationTechnicianId(technician.id)
                          }
                        >
                          <Settings2 /> Services
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-12 text-center text-sm text-slate-500">
            No technician found for this dealership.
          </p>
        )}
      </section>

      {editingTechnician && (
        <TechnicianEditor
          technician={editingTechnician}
          pending={updateMutation.isPending}
          onClose={() => setEditingTechnician(undefined)}
          onSave={(name) =>
            updateMutation.mutateAsync({ id: editingTechnician.id, name })
          }
        />
      )}
      {createOpen && (
        <CreateTechnicianEditor
          dealerships={dealershipsQuery.data ?? []}
          serviceTypes={serviceTypesQuery.data ?? []}
          pending={createMutation.isPending}
          onClose={() => setCreateOpen(false)}
          onSave={(values) => createMutation.mutateAsync(values)}
        />
      )}
      {qualificationTechnician && (
        <QualificationEditor
          technician={qualificationTechnician}
          serviceTypes={serviceTypesQuery.data ?? []}
          loadingServices={serviceTypesQuery.isPending}
          pending={qualificationMutation.isPending}
          onClose={() => setQualificationTechnicianId(undefined)}
          onToggle={(serviceTypeId, attach) =>
            qualificationMutation.mutate({
              technicianId: qualificationTechnician.id,
              serviceTypeId,
              attach,
            })
          }
        />
      )}
    </div>
  )
}

function CreateTechnicianEditor({
  dealerships,
  serviceTypes,
  pending,
  onClose,
  onSave,
}: {
  dealerships: Awaited<ReturnType<typeof schedulerApi.dealerships>>
  serviceTypes: Awaited<ReturnType<typeof schedulerApi.serviceTypes>>
  pending: boolean
  onClose: () => void
  onSave: (values: CreateTechnicianRequest) => Promise<ApiTechnicianManagement>
}) {
  const form = useForm<z.infer<typeof createTechnicianSchema>>({
    resolver: zodResolver(createTechnicianSchema),
    defaultValues: {
      name: "",
      dealershipId: dealerships[0]?.id ?? "",
      serviceTypeIds: [],
    },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create technician</DialogTitle>
          <DialogDescription>
            Choose the dealership and initial service qualifications.
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
            <span>Dealership</span>
            <select
              {...form.register("dealershipId")}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
            >
              {dealerships.map((dealership) => (
                <option key={dealership.id} value={dealership.id}>
                  {dealership.name}
                </option>
              ))}
            </select>
            {form.formState.errors.dealershipId?.message && (
              <span className="block text-xs text-red-600">
                {form.formState.errors.dealershipId.message}
              </span>
            )}
          </label>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">
              Initial service qualifications
            </legend>
            <div className="max-h-52 overflow-auto rounded-lg border">
              {serviceTypes.map((serviceType) => (
                <label
                  key={serviceType.id}
                  className="flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 last:border-b-0 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    value={serviceType.id}
                    {...form.register("serviceTypeIds")}
                    className="size-4"
                  />
                  <span className="flex-1 text-sm font-medium">
                    {serviceType.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {serviceType.durationMinutes} min
                  </span>
                </label>
              ))}
              {!serviceTypes.length && (
                <p className="p-4 text-center text-sm text-slate-500">
                  No service type available.
                </p>
              )}
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !dealerships.length}>
              {pending && <LoaderCircle className="animate-spin" />} Create
              technician
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TechnicianEditor({
  technician,
  pending,
  onClose,
  onSave,
}: {
  technician: ApiTechnicianManagement
  pending: boolean
  onClose: () => void
  onSave: (name: string) => Promise<ApiTechnicianManagement>
}) {
  const form = useForm<z.infer<typeof technicianSchema>>({
    resolver: zodResolver(technicianSchema),
    defaultValues: { name: technician.name },
  })
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update technician</DialogTitle>
          <DialogDescription>{technician.dealership.name}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async ({ name }) => {
            try {
              await onSave(name)
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />} Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function QualificationEditor({
  technician,
  serviceTypes,
  loadingServices,
  pending,
  onClose,
  onToggle,
}: {
  technician: ApiTechnicianManagement
  serviceTypes: Awaited<ReturnType<typeof schedulerApi.serviceTypes>>
  loadingServices: boolean
  pending: boolean
  onClose: () => void
  onToggle: (serviceTypeId: string, attach: boolean) => void
}) {
  const [search, setSearch] = React.useState("")
  const attachedIds = new Set(technician.serviceTypes.map(({ id }) => id))
  const normalizedSearch = search.trim().toLowerCase()
  const filteredServices = serviceTypes.filter(
    ({ name }) => !normalizedSearch || name.toLowerCase().includes(normalizedSearch)
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Service qualifications</DialogTitle>
          <DialogDescription>
            {technician.name} · {technician.dealership.name}. Changes affect
            future allocation; confirmed appointments remain unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search service types"
            className="pl-9"
          />
        </div>
        <div className="max-h-80 overflow-auto rounded-lg border">
          {loadingServices ? (
            <div className="flex justify-center gap-2 p-8 text-sm text-slate-500">
              <LoaderCircle className="size-4 animate-spin" /> Loading services…
            </div>
          ) : filteredServices.length ? (
            filteredServices.map((serviceType) => {
              const attached = attachedIds.has(serviceType.id)
              return (
                <label
                  key={serviceType.id}
                  className="flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 last:border-b-0 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={attached}
                    disabled={pending}
                    onChange={(event) =>
                      onToggle(serviceType.id, event.target.checked)
                    }
                    className="size-4"
                  />
                  <span className="flex-1 text-sm font-medium">
                    {serviceType.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {serviceType.durationMinutes} min
                  </span>
                </label>
              )
            })
          ) : (
            <p className="p-8 text-center text-sm text-slate-500">
              No matching service type.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose} disabled={pending}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function updateTechnicianCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  technician: ApiTechnicianManagement
) {
  queryClient.setQueriesData<ApiTechnicianManagement[]>(
    { queryKey: schedulerQueryKeys.techniciansRoot },
    (current) =>
      current?.map((item) => (item.id === technician.id ? technician : item))
  )
}

function showSaveError(title: string, error: Error) {
  toast.add({
    type: "error",
    title,
    description: error.message,
    priority: "high",
  })
}
