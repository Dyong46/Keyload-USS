"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, Pencil, Plus, RefreshCw, Search } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import {
  schedulerApi,
  schedulerQueryKeys,
  type ApiCustomer,
  type CreateCustomerRequest,
} from "@/features/scheduler/api/scheduler-api"

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[+()\d\s.-]{8,25}$/, "Enter a valid phone number"),
})

type CustomerForm = z.infer<typeof customerSchema>

export function CustomersManagement() {
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [editor, setEditor] = React.useState<
    { customer?: ApiCustomer } | undefined
  >()
  const debouncedSearch = useDebouncedValue(search.trim(), 250)
  const customersQuery = useQuery({
    queryKey: schedulerQueryKeys.customers(debouncedSearch),
    queryFn: ({ signal }) => schedulerApi.customers(debouncedSearch, signal),
  })
  const saveMutation = useMutation({
    mutationFn: ({
      customer,
      values,
    }: {
      customer?: ApiCustomer
      values: CreateCustomerRequest
    }) =>
      customer
        ? schedulerApi.updateCustomer(customer.id, values)
        : schedulerApi.createCustomer(values),
    onSuccess: (customer, variables) => {
      void queryClient.invalidateQueries({
        queryKey: schedulerQueryKeys.customersRoot,
      })
      setEditor(undefined)
      toast.add({
        type: "success",
        title: variables.customer ? "Customer updated" : "Customer created",
        description: `${customer.name} · ${customer.phone}`,
      })
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Could not save customer",
        description: error.message,
        priority: "high",
      })
    },
  })
  const customers = customersQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Customers</h1>
          <p className="text-sm text-slate-500">
            Search by name, phone, or vehicle registration.
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setEditor({})}
        >
          <Plus /> New customer
        </Button>
      </div>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-3">
          <div className="relative max-w-xl">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Customer name, phone, or registration"
              className="h-9 pl-9"
            />
            {customersQuery.isFetching && (
              <LoaderCircle className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>
        </div>

        {customersQuery.isError ? (
          <div className="grid place-items-center gap-2 p-12 text-sm text-red-700">
            Customers could not be loaded.
            <Button
              variant="outline"
              size="sm"
              onClick={() => void customersQuery.refetch()}
            >
              <RefreshCw /> Retry
            </Button>
          </div>
        ) : customersQuery.isPending ? (
          <div className="flex justify-center gap-2 p-12 text-sm text-slate-500">
            <LoaderCircle className="size-4 animate-spin" /> Loading customers…
          </div>
        ) : customers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{customer.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {customer.phone}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditor({ customer })}
                      >
                        <Pencil /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-12 text-center text-sm text-slate-500">
            No matching customer.
          </p>
        )}
        <div className="border-t bg-slate-50 px-4 py-2 text-xs text-slate-500">
          Showing up to 10 results. Refine the search to find another customer.
        </div>
      </section>

      {editor && (
        <CustomerEditor
          customer={editor.customer}
          pending={saveMutation.isPending}
          onClose={() => setEditor(undefined)}
          onSave={(values) =>
            saveMutation.mutateAsync({ customer: editor.customer, values })
          }
        />
      )}
    </div>
  )
}

function CustomerEditor({
  customer,
  pending,
  onClose,
  onSave,
}: {
  customer?: ApiCustomer
  pending: boolean
  onClose: () => void
  onSave: (values: CustomerForm) => Promise<ApiCustomer>
}) {
  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
    },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer ? "Update customer" : "Create customer"}</DialogTitle>
          <DialogDescription>
            Phone numbers are normalized and must be unique.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await onSave(values)
            } catch {
              return
            }
          })}
        >
          <FormField label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} autoFocus />
          </FormField>
          <FormField label="Phone" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} placeholder="0912 345 678" />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />}
              {customer ? "Save changes" : "Create customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  )
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value)
  React.useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delayMs)
    return () => window.clearTimeout(timeout)
  }, [delayMs, value])
  return debouncedValue
}
