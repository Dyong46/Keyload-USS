"use client"

import { useQuery } from "@tanstack/react-query"

import type { ReactNode } from "react"
import {
  schedulerApi,
  schedulerQueryKeys,
} from "@/features/scheduler/api/scheduler-api"
import { SchedulerShell } from "@/features/scheduler/components/scheduler-shell"

export function ManagementShell({ children }: { children: ReactNode }) {
  const healthQuery = useQuery({
    queryKey: schedulerQueryKeys.health,
    queryFn: ({ signal }) => schedulerApi.health(signal),
  })

  return (
    <SchedulerShell
      backendState={
        healthQuery.isSuccess
          ? "connected"
          : healthQuery.isError
            ? "unavailable"
            : "pending"
      }
      staffName={healthQuery.data?.demoStaff.displayName ?? "Demo Staff"}
    >
      {children}
    </SchedulerShell>
  )
}
