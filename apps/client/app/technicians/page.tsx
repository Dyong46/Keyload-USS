import { ManagementShell } from "@/features/management/components/management-shell"
import { TechniciansManagement } from "@/features/management/components/technicians-management"
import { QueryProvider } from "@/providers/query-provider"

export default function TechniciansPage() {
  return (
    <QueryProvider>
      <ManagementShell>
        <TechniciansManagement />
      </ManagementShell>
    </QueryProvider>
  )
}
