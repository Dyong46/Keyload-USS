import type {
  ApiAppointment,
  ApiAppointmentStatus,
} from "@/features/scheduler/api/scheduler-api"

const TIME_ZONE = "Asia/Ho_Chi_Minh"

export type AppointmentPhase =
  "UPCOMING" | "IN_SERVICE" | "AWAITING_COMPLETION" | ApiAppointmentStatus

export function appointmentPhase(
  appointment: ApiAppointment,
  currentTime: number | null
): AppointmentPhase {
  if (appointment.status !== "CONFIRMED") return appointment.status
  if (currentTime === null) return "CONFIRMED"
  if (currentTime < Date.parse(appointment.scheduledStart)) return "UPCOMING"
  if (currentTime < Date.parse(appointment.scheduledEnd)) return "IN_SERVICE"
  return "AWAITING_COMPLETION"
}

export function formatAppointmentDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(value))
}

export function formatAppointmentTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(new Date(value))
}

export function formatAppointmentDateTime(value: string) {
  return `${formatAppointmentDate(value)}, ${formatAppointmentTime(value)}`
}
