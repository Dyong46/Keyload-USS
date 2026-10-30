import { SchedulerDemo } from "@/components/scheduler-demo"
import { QueryProvider } from "@/providers/query-provider"

export default function NewAppointmentPage() {
  return (
    <QueryProvider>
      <SchedulerDemo initialView="booking" />
    </QueryProvider>
  )
}
