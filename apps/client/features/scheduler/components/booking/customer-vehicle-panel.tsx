"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircle, Plus, Search, UserRound } from "lucide-react"
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
import type { BookingViewProps } from "@/features/scheduler/components/booking/booking-types"
import { cn } from "@/lib/utils"

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[+()\d\s.-]{8,25}$/, "Enter a valid phone number"),
})
const vehicleSchema = z.object({
  registrationNumber: z.string().trim().min(3).max(20),
  make: z.string().trim().min(1, "Make is required").max(50),
  model: z.string().trim().min(1, "Model is required").max(50),
})

export function CustomerVehiclePanel(props: BookingViewProps) {
  const [customerDialogOpen, setCustomerDialogOpen] = React.useState(false)
  const [vehicleDialogOpen, setVehicleDialogOpen] = React.useState(false)

  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Customer and vehicle
          </h2>
          <p className="text-xs text-slate-500">
            Search by phone, registration, or customer name.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCustomerDialogOpen(true)}
        >
          <Plus /> New customer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          autoFocus
          value={props.customerSearch}
          onChange={(event) => props.setCustomerSearch(event.target.value)}
          placeholder="Phone, registration, or customer name"
          className="h-10 pl-9"
        />
        {props.customersPending && (
          <LoaderCircle className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>

      {props.customerSearch.trim().length >= 2 && (
        <div className="mt-2 max-h-40 overflow-auto rounded-lg border">
          {props.customerResults.length ? (
            props.customerResults.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => props.selectCustomer(customer)}
                className={cn(
                  "flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50",
                  props.selectedCustomer?.id === customer.id && "bg-blue-50"
                )}
              >
                <span className="font-medium">{customer.name}</span>
                <span className="text-xs text-slate-500">{customer.phone}</span>
              </button>
            ))
          ) : !props.customersPending ? (
            <div className="p-3 text-sm text-slate-500">
              No customer found. Create a new record.
            </div>
          ) : null}
        </div>
      )}

      {props.selectedCustomer && (
        <div className="mt-4 grid gap-4 md:grid-cols-[240px_1fr]">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <UserRound className="size-4 text-blue-600" />
              <span className="text-sm font-semibold">
                {props.selectedCustomer.name}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {props.selectedCustomer.phone}
            </p>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">
                Vehicles
              </span>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setVehicleDialogOpen(true)}
              >
                <Plus /> Add vehicle
              </Button>
            </div>
            {props.vehiclesPending ? (
              <p className="text-xs text-slate-500">Loading vehicles…</p>
            ) : props.vehicles.length ? (
              <div className="flex flex-wrap gap-2">
                {props.vehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => props.selectVehicle(vehicle)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-xs",
                      props.selectedVehicle?.id === vehicle.id
                        ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                        : "hover:bg-slate-50"
                    )}
                  >
                    <span className="block font-semibold">
                      {vehicle.registrationNumber}
                    </span>
                    <span className="text-slate-500">
                      {vehicle.make} {vehicle.model}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-700">
                No vehicle found. Add one to continue.
              </p>
            )}
          </div>
        </div>
      )}

      <CreateCustomerDialog
        open={customerDialogOpen}
        setOpen={setCustomerDialogOpen}
        pending={props.creatingCustomer}
        createCustomer={async (values) => {
          const customer = await props.createCustomer(values)
          props.selectCustomer(customer)
        }}
      />
      {props.selectedCustomer && (
        <CreateVehicleDialog
          open={vehicleDialogOpen}
          setOpen={setVehicleDialogOpen}
          pending={props.creatingVehicle}
          createVehicle={async (values) => {
            const vehicle = await props.createVehicle(values)
            props.selectVehicle(vehicle)
          }}
        />
      )}
    </section>
  )
}

function CreateCustomerDialog({
  open,
  setOpen,
  pending,
  createCustomer,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  pending: boolean
  createCustomer: (values: z.infer<typeof customerSchema>) => Promise<void>
}) {
  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "" },
  })
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create customer</DialogTitle>
          <DialogDescription>
            Phone is normalized and used to prevent duplicate customer records.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await createCustomer(values)
              form.reset()
              setOpen(false)
            } catch {}
          })}
        >
          <FormField label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} />
          </FormField>
          <FormField label="Phone" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} placeholder="0912 345 678" />
          </FormField>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />} Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CreateVehicleDialog({
  open,
  setOpen,
  pending,
  createVehicle,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  pending: boolean
  createVehicle: (values: z.infer<typeof vehicleSchema>) => Promise<void>
}) {
  const form = useForm<z.infer<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { registrationNumber: "", make: "", model: "" },
  })
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add vehicle</DialogTitle>
          <DialogDescription>
            Registration is normalized for fast lookup and duplicate checks.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await createVehicle(values)
              form.reset()
              setOpen(false)
            } catch {}
          })}
        >
          <FormField
            label="Registration"
            error={form.formState.errors.registrationNumber?.message}
          >
            <Input {...form.register("registrationNumber")} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Make" error={form.formState.errors.make?.message}>
              <Input {...form.register("make")} />
            </FormField>
            <FormField
              label="Model"
              error={form.formState.errors.model?.message}
            >
              <Input {...form.register("model")} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />} Add vehicle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block text-sm font-medium">
      <span>{label}</span>
      <span className="mt-1 block">{children}</span>
      {error && (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      )}
    </label>
  )
}
