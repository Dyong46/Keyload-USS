"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { toast } from "@/components/ui/toast"
import {
  schedulerApi,
  schedulerQueryKeys,
  type CreateCustomerRequest,
  type CreateVehicleRequest,
} from "@/features/scheduler/api/scheduler-api"

export function useCustomerLookup(search: string, customerId?: string) {
  const queryClient = useQueryClient()
  const normalizedSearch = search.trim()
  const customersQuery = useQuery({
    queryKey: schedulerQueryKeys.customers(normalizedSearch),
    queryFn: ({ signal }) => schedulerApi.customers(normalizedSearch, signal),
    enabled: normalizedSearch.length >= 2,
  })
  const vehiclesQuery = useQuery({
    queryKey: schedulerQueryKeys.vehicles(customerId ?? ""),
    queryFn: ({ signal }) => schedulerApi.vehicles(customerId!, signal),
    enabled: Boolean(customerId),
  })
  const createCustomerMutation = useMutation({
    mutationFn: (body: CreateCustomerRequest) =>
      schedulerApi.createCustomer(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: schedulerQueryKeys.customersRoot,
      })
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Could not create customer",
        description: error.message,
        priority: "high",
      })
    },
  })
  const createVehicleMutation = useMutation({
    mutationFn: ({
      ownerId,
      body,
    }: {
      ownerId: string
      body: CreateVehicleRequest
    }) => schedulerApi.createVehicle(ownerId, body),
    onSuccess: (_vehicle, variables) => {
      void queryClient.invalidateQueries({
        queryKey: schedulerQueryKeys.vehicles(variables.ownerId),
      })
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Could not add vehicle",
        description: error.message,
        priority: "high",
      })
    },
  })

  return {
    customersQuery,
    vehiclesQuery,
    createCustomer: (body: CreateCustomerRequest) =>
      createCustomerMutation.mutateAsync(body),
    createVehicle: (body: CreateVehicleRequest) => {
      if (!customerId) throw new Error("Select a customer first")
      return createVehicleMutation.mutateAsync({ ownerId: customerId, body })
    },
    creatingCustomer: createCustomerMutation.isPending,
    creatingVehicle: createVehicleMutation.isPending,
  }
}
