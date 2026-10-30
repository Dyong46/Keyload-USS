import { SchedulerDemo } from "@/components/scheduler-demo"
import { QueryProvider } from "@/providers/query-provider"

export default function Page() {
  return (
    <QueryProvider>
      <SchedulerDemo />
    </QueryProvider>
  )
}
