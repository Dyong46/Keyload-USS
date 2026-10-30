import { SchedulerApp } from "@/components/scheduler-app"
import { QueryProvider } from "@/providers/query-provider"

export default function Page() {
  return (
    <QueryProvider>
      <SchedulerApp />
    </QueryProvider>
  )
}
