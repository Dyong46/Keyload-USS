import { CustomersManagement } from "@/features/management/components/customers-management"
import { ManagementShell } from "@/features/management/components/management-shell"
import { QueryProvider } from "@/providers/query-provider"

export default function CustomersPage() {
  return (
    <QueryProvider>
      <ManagementShell>
        <CustomersManagement />
      </ManagementShell>
    </QueryProvider>
  )
}
