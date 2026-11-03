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
import { Controller, useForm } from "react-hook-form"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import {
  schedulerApi,
  schedulerQueryKeys,
  type ApiTechnicianManagement,
  type CreateTechnicianRequest,
  type UpdateTechnicianRequest,
} from "@/features/scheduler/api/scheduler-api"

const ALL_DEALERSHIPS = "all"

const technicianSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  dealershipId: z.string().uuid("Select a dealership"),
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
    mutationFn: ({ id, body }: { id: string; body: UpdateTechnicianRequest }) =>
      schedulerApi.updateTechnician(id, body),
    onSuccess: (technician) => {
      void queryClient.invalidateQueries({
        queryKey: schedulerQueryKeys.techniciansRoot,
      })
      void queryClient.invalidateQueries({
        queryKey: schedulerQueryKeys.appointmentsRoot,
      })
      void queryClient.invalidateQueries({
        queryKey: schedulerQueryKeys.availabilityRoot,
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
        ? schedulerApi.attachTechnicianServiceType(technicianId, serviceTypeId)
        : schedulerApi.detachTechnicianServiceType(technicianId, serviceTypeId),
    onSuccess: (technician, variables) => {
      updateTechnicianCaches(queryClient, technician)
      void queryClient.invalidateQueries({
        queryKey: schedulerQueryKeys.availabilityRoot,
      })
      toast.add({
        type: "success",
        title: variables.attach
          ? "Qualification attached"
          : "Qualification removed",
        description: `${technician.name} · future availability updated`,
      })
    },
    onError: (error) => showSaveError("Could not update qualification", error),
  })
  const technicians = techniciansQuery.data ?? []
  const qualificationTechnician = technicians.find(
    ({ id }) => id === qualificationTechnicianId
  )
  const dealershipOptions = [
    { label: "All dealerships", value: ALL_DEALERSHIPS },
    ...(dealershipsQuery.data ?? []).map((dealership) => ({
      label: dealership.name,
      value: dealership.id,
    })),
  ]

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
          <Select
            items={dealershipOptions}
            value={dealershipId || ALL_DEALERSHIPS}
            onValueChange={(value) =>
              setDealershipId(value === ALL_DEALERSHIPS ? "" : (value ?? ""))
            }
          >
            <SelectTrigger
              className="w-full"
              aria-label="Filter technicians by dealership"
            >
              <SelectValue placeholder="All dealerships" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                {dealershipOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
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
          dealerships={dealershipsQuery.data ?? []}
          pending={updateMutation.isPending}
          onClose={() => setEditingTechnician(undefined)}
          onSave={(body) =>
            updateMutation.mutateAsync({ id: editingTechnician.id, body })
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
  const [serviceSearch, setServiceSearch] = React.useState("")
  const form = useForm<z.infer<typeof createTechnicianSchema>>({
    resolver: zodResolver(createTechnicianSchema),
    defaultValues: {
      name: "",
      dealershipId: dealerships[0]?.id ?? "",
      serviceTypeIds: [],
    },
  })
  const dealershipOptions = dealerships.map((dealership) => ({
    label: dealership.name,
    value: dealership.id,
  }))
  const normalizedServiceSearch = serviceSearch.trim().toLowerCase()
  const filteredServiceTypes = serviceTypes.filter(
    ({ name }) =>
      !normalizedServiceSearch ||
      name.toLowerCase().includes(normalizedServiceSearch)
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
          <div className="block space-y-1.5 text-sm font-medium">
            <span>Dealership</span>
            <Controller
              control={form.control}
              name="dealershipId"
              render={({ field }) => (
                <Select
                  items={dealershipOptions}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? "")}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={Boolean(form.formState.errors.dealershipId)}
                  >
                    <SelectValue placeholder="Select dealership" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      {dealershipOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.dealershipId?.message && (
              <span className="block text-xs text-red-600">
                {form.formState.errors.dealershipId.message}
              </span>
            )}
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">
              Initial service qualifications ({serviceTypes.length})
            </legend>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={serviceSearch}
                onChange={(event) => setServiceSearch(event.target.value)}
                placeholder="Search service types"
                className="pl-9"
              />
            </div>
            <div className="h-80 overflow-y-auto overscroll-contain rounded-lg border">
              {filteredServiceTypes.map((serviceType) => (
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
              {!filteredServiceTypes.length && (
                <p className="p-4 text-center text-sm text-slate-500">
                  {serviceTypes.length
                    ? "No matching service type."
                    : "No service type available."}
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
  dealerships,
  pending,
  onClose,
  onSave,
}: {
  technician: ApiTechnicianManagement
  dealerships: Awaited<ReturnType<typeof schedulerApi.dealerships>>
  pending: boolean
  onClose: () => void
  onSave: (body: UpdateTechnicianRequest) => Promise<ApiTechnicianManagement>
}) {
  const form = useForm<z.infer<typeof technicianSchema>>({
    resolver: zodResolver(technicianSchema),
    defaultValues: {
      name: technician.name,
      dealershipId: technician.dealership.id,
    },
  })
  const dealershipOptions = dealerships.map((dealership) => ({
    label: dealership.name,
    value: dealership.id,
  }))
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update technician</DialogTitle>
          <DialogDescription>
            Update the technician name and dealership.
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
          <div className="block space-y-1.5 text-sm font-medium">
            <span>Dealership</span>
            <Controller
              control={form.control}
              name="dealershipId"
              render={({ field }) => (
                <Select
                  items={dealershipOptions}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? "")}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={Boolean(form.formState.errors.dealershipId)}
                  >
                    <SelectValue placeholder="Select dealership" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      {dealershipOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.dealershipId?.message && (
              <span className="block text-xs text-red-600">
                {form.formState.errors.dealershipId.message}
              </span>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || !dealershipOptions.length}
            >
              {pending && <LoaderCircle className="animate-spin" />} Save
              changes
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
    ({ name }) =>
      !normalizedSearch || name.toLowerCase().includes(normalizedSearch)
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Service qualifications</DialogTitle>
          <DialogDescription>
            {technician.name} · {technician.dealership.name}. Changes affect
            future allocation; confirmed appointments remain unchanged.{" "}
            {serviceTypes.length} services available.
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
        <div className="h-80 overflow-y-auto overscroll-contain rounded-lg border">
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
