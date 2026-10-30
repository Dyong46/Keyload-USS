import { ManagementShell } from "@/features/management/components/management-shell"
import { ServiceTypesManagement } from "@/features/management/components/service-types-management"
import { QueryProvider } from "@/providers/query-provider"

export default function ServiceTypesPage() {
  return (
    <QueryProvider>
      <ManagementShell>
        <ServiceTypesManagement />
      </ManagementShell>
    </QueryProvider>
  )
}
