"use client"

import * as React from "react"
import {
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  ServerCrash,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  type ApiAppointment,
  type ApiAppointmentStatus,
} from "@/features/scheduler/api/scheduler-api"
import { AppointmentActions } from "@/features/scheduler/components/appointment-actions"
import { appointmentPhase } from "@/features/scheduler/components/appointment-presentation"
import { AppointmentSchedule } from "@/features/scheduler/components/appointment-schedule"
import { AppointmentStatus } from "@/features/scheduler/components/appointment-status"
import type { AppointmentAction } from "@/features/scheduler/hooks/use-appointments"
import { cn } from "@/lib/utils"

export function AppointmentsView({
  appointments,
  totalAppointments,
  page,
  pageSize,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  setPage,
  onStartBooking,
  onAppointmentAction,
  pendingAction,
  appointmentsPending,
  appointmentsError,
  onRetryAppointments,
  referenceReady,
  referenceError,
  onRetryReferences,
}: {
  appointments: ApiAppointment[]
  totalAppointments: number
  page: number
  pageSize: number
  search: string
  setSearch: (value: string) => void
  statusFilter: "ALL" | ApiAppointmentStatus
  setStatusFilter: (value: "ALL" | ApiAppointmentStatus) => void
  setPage: (page: number) => void
  onStartBooking: () => void
  onAppointmentAction: (id: string, action: AppointmentAction) => void
  pendingAction?: { id: string; action: AppointmentAction }
  appointmentsPending: boolean
  appointmentsError: boolean
  onRetryAppointments: () => void
  referenceReady: boolean
  referenceError: boolean
  onRetryReferences: () => void
}) {
  const [currentTime, setCurrentTime] = React.useState<number | null>(null)
  React.useEffect(() => {
    const refresh = () => setCurrentTime(Date.now())
    refresh()
    const interval = window.setInterval(refresh, 30_000)
    return () => window.clearInterval(interval)
  }, [])
  const totalPages = Math.max(1, Math.ceil(totalAppointments / pageSize))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Appointments</h1>
          <p className="text-sm text-slate-500">
            Search and manage dealership service bookings.
          </p>
        </div>
        <Button
          onClick={onStartBooking}
          disabled={!referenceReady}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus /> New appointment
        </Button>
      </div>

      {referenceError && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Reference data is unavailable.
          <Button variant="outline" size="sm" onClick={onRetryReferences}>
            <RefreshCw /> Retry
          </Button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-wrap gap-2 border-b p-3">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Customer, phone, or registration"
              className="h-9 pl-9"
            />
          </div>
          <div className="flex gap-1">
            {(["ALL", "CONFIRMED", "COMPLETED", "CANCELLED"] as const).map(
              (status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === "ALL"
                    ? "All"
                    : status.charAt(0) + status.slice(1).toLowerCase()}
                </Button>
              )
            )}
          </div>
        </div>

        {appointmentsPending ? (
          <StateMessage icon={LoaderCircle} spin text="Loading appointments…" />
        ) : appointmentsError ? (
          <div className="grid place-items-center gap-2 p-12 text-sm text-red-700">
            <ServerCrash className="size-6" /> Appointments are unavailable.
            <Button variant="outline" size="sm" onClick={onRetryAppointments}>
              <RefreshCw /> Retry
            </Button>
          </div>
        ) : appointments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">Schedule</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Services</th>
                  <th className="px-3 py-2">Resources</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => {
                  const phase = appointmentPhase(appointment, currentTime)

                  return (
                    <tr
                      key={appointment.id}
                      className={cn(
                        "border-t align-top transition-colors hover:bg-slate-50/70",
                        phase === "AWAITING_COMPLETION" && "bg-amber-50/40"
                      )}
                    >
                      <td className="px-3 py-3">
                        <AppointmentSchedule appointment={appointment} />
                      </td>
                      <td className="px-3 py-3">
                        <span className="block font-medium">
                          {appointment.customer.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {appointment.customer.phone}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="block font-medium">
                          {appointment.vehicle.registrationNumber}
                        </span>
                        <span className="text-xs text-slate-500">
                          {appointment.vehicle.make} {appointment.vehicle.model}
                        </span>
                      </td>
                      <td className="max-w-64 px-3 py-3 text-xs">
                        {appointment.services
                          .map((service) => service.name)
                          .join(", ")}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {appointment.technician.name}
                        <span className="block text-slate-500">
                          {appointment.serviceBay.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <AppointmentStatus
                          appointment={appointment}
                          currentTime={currentTime}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end">
                          <AppointmentActions
                            appointment={appointment}
                            currentTime={currentTime}
                            pendingAction={pendingAction}
                            onAction={onAppointmentAction}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <StateMessage icon={Search} text="No appointments found." />
        )}

        <div className="flex items-center justify-between border-t bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <span>
            {appointments.length} of {totalAppointments} · Page {page} of{" "}
            {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="xs"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="xs"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function StateMessage({
  icon: Icon,
  text,
  spin = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  text: string
  spin?: boolean
}) {
  return (
    <div className="grid place-items-center gap-2 p-12 text-sm text-slate-500">
      <Icon className={cn("size-6", spin && "animate-spin")} /> {text}
    </div>
  )
}
