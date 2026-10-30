import {
  CalendarDays,
  LoaderCircle,
  RefreshCw,
  ServerCrash,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/features/scheduler/components/scheduler-fields"
import type { BookingViewProps } from "@/features/scheduler/components/booking/booking-types"
import { cn } from "@/lib/utils"

function vietnamTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value))
}

export function AvailabilityTable(props: BookingViewProps) {
  const readyForAvailability = Boolean(
    props.selectedVehicle && props.dealershipId && props.serviceIds.length
  )

  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Dealership
          </label>
          <NativeSelect
            ariaLabel="Dealership"
            value={props.dealershipId}
            onChange={props.setDealershipId}
          >
            {props.dealerships.map((dealership) => (
              <option key={dealership.id} value={dealership.id}>
                {dealership.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <label className="w-44">
          <span className="mb-1 block text-xs font-semibold text-slate-600">
            Service date
          </span>
          <Input
            type="date"
            min={props.minimumDate}
            value={props.selectedDate}
            onChange={(event) => props.setSelectedDate(event.target.value)}
            className="h-11"
          />
        </label>
      </div>

      {!readyForAvailability ? (
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
          Select a vehicle and at least one service to load availability.
        </div>
      ) : props.availabilityPending ? (
        <div className="flex min-h-24 items-center justify-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="size-4 animate-spin" /> Checking
          availability…
        </div>
      ) : props.availabilityError ? (
        <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg bg-red-50 text-sm text-red-700">
          <ServerCrash className="size-5" /> Availability could not be loaded.
          <Button variant="outline" size="sm" onClick={props.retryAvailability}>
            <RefreshCw /> Retry
          </Button>
        </div>
      ) : props.availabilitySlots.length ? (
        <>
          <div className="max-h-56 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Technicians</th>
                  <th className="px-3 py-2">Bays</th>
                </tr>
              </thead>
              <tbody>
                {props.availabilitySlots.map((slot) => (
                  <tr
                    key={slot.scheduledStart}
                    onClick={() => props.selectSlot(slot)}
                    className={cn(
                      "cursor-pointer border-t hover:bg-slate-50",
                      props.selectedTime === slot.scheduledStart && "bg-blue-50"
                    )}
                  >
                    <td className="px-3 py-2 font-semibold">
                      {vietnamTime(slot.scheduledStart)}–
                      {vietnamTime(slot.scheduledEnd)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {slot.technicians.length} available
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {slot.serviceBays.length} available
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {props.selectedSlot && (
            <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-semibold">
                  Technician
                </span>
                <NativeSelect
                  ariaLabel="Technician"
                  value={props.technicianId}
                  onChange={props.setTechnicianId}
                >
                  {props.selectedSlot.technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold">
                  Service bay
                </span>
                <NativeSelect
                  ariaLabel="Service bay"
                  value={props.bayId}
                  onChange={props.setBayId}
                >
                  {props.selectedSlot.serviceBays.map((bay) => (
                    <option key={bay.id} value={bay.id}>
                      {bay.label}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          No available slot. Try another date, dealership, or service selection.
        </div>
      )}
      <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
        <CalendarDays className="size-3" /> Vietnam time · availability is
        rechecked on confirmation
      </p>
    </section>
  )
}
