"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import {
  schedulerApi,
  schedulerQueryKeys,
  type ApiDealership,
} from "@/features/scheduler/api/scheduler-api"
import {
  DEALERSHIPS as DEMO_DEALERSHIPS,
  type Dealership,
} from "@/lib/mock-scheduler"

export type SchedulerDealership = ApiDealership &
  Pick<Dealership, "address" | "technicians" | "bays">

export function useSchedulerReferenceData() {
  const healthQuery = useQuery({
    queryKey: schedulerQueryKeys.health,
    queryFn: ({ signal }) => schedulerApi.health(signal),
    refetchInterval: 30_000,
  })
  const dealershipsQuery = useQuery({
    queryKey: schedulerQueryKeys.dealerships,
    queryFn: ({ signal }) => schedulerApi.dealerships(signal),
  })
  const serviceTypesQuery = useQuery({
    queryKey: schedulerQueryKeys.serviceTypes,
    queryFn: ({ signal }) => schedulerApi.serviceTypes(signal),
  })

  const dealerships = React.useMemo<SchedulerDealership[]>(
    () =>
      (dealershipsQuery.data ?? []).map((apiDealership, index) => {
        const demoDealership =
          DEMO_DEALERSHIPS.find((item) => item.name === apiDealership.name) ??
          DEMO_DEALERSHIPS[index]

        return {
          ...apiDealership,
          address: demoDealership?.address ?? "Demo dealership",
          technicians: demoDealership?.technicians ?? [],
          bays: demoDealership?.bays ?? [],
        }
      }),
    [dealershipsQuery.data]
  )

  const referenceQueries = [dealershipsQuery, serviceTypesQuery]
  const referenceReady =
    referenceQueries.every((query) => query.isSuccess) &&
    Boolean(dealerships.length && serviceTypesQuery.data?.length)

  function retryReferences() {
    void Promise.all(referenceQueries.map((query) => query.refetch()))
  }

  return {
    healthQuery,
    dealerships,
    serviceTypes: serviceTypesQuery.data ?? [],
    referenceReady,
    referenceError: referenceQueries.some((query) => query.isError),
    retryReferences,
  }
}
