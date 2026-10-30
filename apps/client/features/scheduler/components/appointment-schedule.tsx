import { Clock3 } from "lucide-react"

import type { ApiAppointment } from "@/features/scheduler/api/scheduler-api"
import {
  formatAppointmentDate,
  formatAppointmentTime,
} from "@/features/scheduler/components/appointment-presentation"

export function AppointmentSchedule({
  appointment,
}: {
  appointment: ApiAppointment
}) {
  return (
    <div className="min-w-40">
      <p className="font-medium whitespace-nowrap">
        {formatAppointmentDate(appointment.scheduledStart)}
      </p>
      <p className="mt-1 flex items-center gap-1 text-xs whitespace-nowrap text-slate-500">
        <Clock3 className="size-3.5" />
        {formatAppointmentTime(appointment.scheduledStart)}–
        {formatAppointmentTime(appointment.scheduledEnd)}
        <span className="text-slate-300">·</span>
        {appointment.totalDurationMinutes} min
      </p>
    </div>
  )
}
