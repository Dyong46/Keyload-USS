"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import type { BookingViewProps } from "@/features/scheduler/components/booking/booking-types"
import { minutesLabel } from "@/features/scheduler/scheduler-format"
import { cn } from "@/lib/utils"

export function ServiceTable(props: BookingViewProps) {
  const [search, setSearch] = React.useState("")
  const query = search.trim().toLowerCase()
  const services = props.serviceTypes.filter(
    (service) => !query || service.name.toLowerCase().includes(query)
  )

  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Services</h2>
          <p className="text-xs text-slate-500">
            Search and select one or more fixed-duration services.
          </p>
        </div>
        <div className="text-right text-xs">
          <span className="font-semibold">{props.serviceIds.length}</span>{" "}
          selected · {minutesLabel(props.totalDuration)}
        </div>
      </div>
      <div className="relative mb-2">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search services"
          className="h-9 pl-9"
        />
      </div>
      <div className="max-h-64 overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="w-10 px-3 py-2">Use</th>
              <th className="px-3 py-2">Service</th>
              <th className="w-24 px-3 py-2 text-right">Duration</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => {
              const selected = props.serviceIds.includes(service.id)
              return (
                <tr
                  key={service.id}
                  onClick={() => props.toggleService(service.id)}
                  className={cn(
                    "cursor-pointer border-t hover:bg-slate-50",
                    selected && "bg-blue-50"
                  )}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      readOnly
                      aria-label={`Select ${service.name}`}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{service.name}</td>
                  <td className="px-3 py-2 text-right text-slate-500">
                    {minutesLabel(service.durationMinutes)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!services.length && (
          <p className="p-4 text-center text-sm text-slate-500">
            No service matches this search.
          </p>
        )}
      </div>
    </section>
  )
}
