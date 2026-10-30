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
  const isPending = pendingAction?.id === appointment.id
  const canComplete =
    currentTime !== null &&
    currentTime >= Date.parse(appointment.scheduledStart)

  if (appointment.status !== "CONFIRMED") return null

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={!canComplete || isPending}
        title={
          canComplete
            ? "Complete service"
            : "Available when the scheduled service begins"
        }
        onClick={() => onAction(appointment.id, "complete")}
        className="text-emerald-700"
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
        size="icon-sm"
        disabled={isPending}
        aria-label={`Cancel ${appointment.id}`}
        onClick={() => setCancelOpen(true)}
      >
        {isPending && pendingAction.action === "cancel" ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <X />
        )}
      </Button>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This keeps the appointment in the history with a cancelled status
              and releases its remaining technician and service bay time.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
