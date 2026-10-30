import { SchedulerApp } from "@/components/scheduler-app"
import { QueryProvider } from "@/providers/query-provider"

export default function NewAppointmentPage() {
  return (
    <QueryProvider>
      <SchedulerApp initialView="booking" />
    </QueryProvider>
  )
}
