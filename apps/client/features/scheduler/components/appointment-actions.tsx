"use client"

import * as React from "react"
import { Check, LoaderCircle, X } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { ApiAppointment } from "@/features/scheduler/api/scheduler-api"
import {
  formatAppointmentDate,
  formatAppointmentTime,
} from "@/features/scheduler/components/appointment-presentation"
import type { AppointmentAction } from "@/features/scheduler/hooks/use-appointments"

type AppointmentActionsProps = {
  appointment: ApiAppointment
  currentTime: number | null
  pendingAction?: { id: string; action: AppointmentAction }
  onAction: (id: string, action: AppointmentAction) => void
}

export function AppointmentActions({
  appointment,
  currentTime,
  pendingAction,
  onAction,
}: AppointmentActionsProps) {
  const [cancelOpen, setCancelOpen] = React.useState(false)
  const [completeOpen, setCompleteOpen] = React.useState(false)
  const isPending = pendingAction?.id === appointment.id
  const canComplete =
    currentTime !== null &&
    currentTime >= Date.parse(appointment.scheduledStart)

  if (appointment.status !== "CONFIRMED") return null

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={!canComplete || isPending}
            title={
              canComplete
                ? "Complete service"
                : "Available when the scheduled service begins"
            }
            onClick={() => setCompleteOpen(true)}
            className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          >
            {isPending && pendingAction.action === "complete" ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Check />
            )}
            Complete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => setCancelOpen(true)}
            className="text-slate-600 hover:bg-red-50 hover:text-red-700"
          >
            {isPending && pendingAction.action === "cancel" ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <X />
            )}
            Cancel
          </Button>
        </div>
        {!canComplete && currentTime !== null && (
          <span className="text-[11px] text-slate-400">
            Complete available from{" "}
            {formatAppointmentTime(appointment.scheduledStart)}
          </span>
        )}
      </div>

      <AlertDialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark service as completed?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that the service for{" "}
              {appointment.vehicle.registrationNumber} has finished. This action
              cannot be undone and releases any remaining reserved time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AppointmentSummary appointment={appointment} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Go back</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                setCompleteOpen(false)
                onAction(appointment.id, "complete")
              }}
            >
              Mark completed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This keeps the appointment in the history with a cancelled status
              and releases its remaining technician and service bay time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AppointmentSummary appointment={appointment} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Keep appointment
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                setCancelOpen(false)
                onAction(appointment.id, "cancel")
              }}
            >
              Cancel appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function AppointmentSummary({ appointment }: { appointment: ApiAppointment }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3 text-sm">
      <p className="font-medium">
        {appointment.customer.name} · {appointment.vehicle.registrationNumber}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {formatAppointmentDate(appointment.scheduledStart)} ·{" "}
        {formatAppointmentTime(appointment.scheduledStart)}–
        {formatAppointmentTime(appointment.scheduledEnd)}
      </p>
    </div>
  )
}
