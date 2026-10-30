import { Badge } from "@/components/ui/badge"
import type { ApiAppointment } from "@/features/scheduler/api/scheduler-api"
import {
  appointmentPhase,
  formatAppointmentDateTime,
  type AppointmentPhase,
} from "@/features/scheduler/components/appointment-presentation"
import { cn } from "@/lib/utils"

const PHASE_COPY: Record<
  AppointmentPhase,
  { label: string; className: string }
> = {
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-blue-50 text-blue-700",
  },
  UPCOMING: {
    label: "Upcoming",
    className: "bg-blue-50 text-blue-700",
  },
  IN_SERVICE: {
    label: "In service",
    className: "bg-violet-50 text-violet-700",
  },
  AWAITING_COMPLETION: {
    label: "Awaiting completion",
    className: "bg-amber-50 text-amber-800",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-600",
  },
}

export function AppointmentStatus({
  appointment,
  currentTime,
}: {
  appointment: ApiAppointment
  currentTime: number | null
}) {
  const phase = appointmentPhase(appointment, currentTime)
  const copy = PHASE_COPY[phase]
  const event =
    appointment.status === "COMPLETED" && appointment.actualCompletedAt
      ? `Completed ${formatAppointmentDateTime(appointment.actualCompletedAt)}`
      : appointment.status === "CANCELLED" && appointment.cancelledAt
        ? `Cancelled ${formatAppointmentDateTime(appointment.cancelledAt)}`
        : phase === "AWAITING_COMPLETION"
          ? "Scheduled time has ended"
          : phase === "IN_SERVICE"
            ? "Within scheduled service time"
            : undefined

  return (
    <div className="space-y-1.5">
      <Badge variant="outline" className={cn("border-0", copy.className)}>
        {copy.label}
      </Badge>
      {event && (
        <p className="max-w-40 text-[11px] leading-4 text-slate-500">{event}</p>
      )}
    </div>
  )
}
