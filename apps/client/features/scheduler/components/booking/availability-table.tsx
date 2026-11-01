import {
  CalendarDays,
  LoaderCircle,
  RefreshCw,
  ServerCrash,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { ApiAvailabilityEmptyReason } from "@/features/scheduler/api/scheduler-api"
import type { BookingViewProps } from "@/features/scheduler/components/booking/booking-types"
import { latestManualStart } from "@/features/scheduler/components/booking/booking-time"
import { ServiceDatePicker } from "@/features/scheduler/components/booking/service-date-picker"
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
      <div className="mb-3 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Dealership
            </label>
            <BookingSelect
              ariaLabel="Dealership"
              value={props.dealershipId}
              onChange={props.setDealershipId}
              placeholder="Select dealership"
              options={props.dealerships.map((dealership) => ({
                value: dealership.id,
                label: dealership.name,
              }))}
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold text-slate-600">
              Service date
            </span>
            <ServiceDatePicker
              value={props.selectedDate}
              minimumDate={props.minimumDate}
              onChange={props.setSelectedDate}
            />
          </div>
        </div>
        <div className="flex h-9 items-center gap-2 rounded-md border px-3">
          <Switch
            id="manual-allocation"
            checked={props.allocationMode === "manual"}
            onCheckedChange={(checked) =>
              checked
                ? props.enableManualAllocation()
                : props.useSuggestedAllocation()
            }
            aria-label="Manual allocation"
            disabled={!readyForAvailability}
          />
          <label
            htmlFor="manual-allocation"
            className={cn(
              "cursor-pointer text-sm font-medium",
              !readyForAvailability && "cursor-not-allowed text-slate-400"
            )}
          >
            Manual allocation
          </label>
        </div>
      </div>

      {!readyForAvailability ? (
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
          Select a vehicle and at least one service to load availability.
        </div>
      ) : props.allocationMode === "manual" ? (
        <ManualAllocation {...props} />
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
                <BookingSelect
                  ariaLabel="Technician"
                  value={props.technicianId}
                  onChange={props.setTechnicianId}
                  placeholder="Select technician"
                  options={props.selectedSlot.technicians.map((technician) => ({
                    value: technician.id,
                    label: technician.name,
                  }))}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold">
                  Service bay
                </span>
                <BookingSelect
                  ariaLabel="Service bay"
                  value={props.bayId}
                  onChange={props.setBayId}
                  placeholder="Select service bay"
                  options={props.selectedSlot.serviceBays.map((bay) => ({
                    value: bay.id,
                    label: bay.label,
                  }))}
                />
              </label>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">No suggested slot</p>
          <p className="mt-1 text-amber-800">
            {emptyReasonMessage(props.availabilityEmptyReason)}
          </p>
        </div>
      )}
      <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
        <CalendarDays className="size-3" /> Vietnam time · availability is
        rechecked on confirmation
      </p>
    </section>
  )
}

function ManualAllocation(props: BookingViewProps) {
  const latestTime = latestManualStart(props.totalDuration)

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-amber-950">
          Manual allocation
        </p>
      </div>
      {props.manualResourcesPending ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="size-4 animate-spin" /> Loading dealership
          resources…
        </div>
      ) : props.manualResourcesError ? (
        <div className="flex items-center gap-2 text-sm text-red-700">
          Resources could not be loaded.
          <Button
            variant="outline"
            size="sm"
            onClick={props.retryManualResources}
          >
            <RefreshCw /> Retry
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className="mb-1 block text-xs font-semibold">Start time</span>
            <Input
              type="time"
              min="08:00"
              max={latestTime ?? "08:00"}
              step={1800}
              value={props.manualTime}
              onChange={(event) => props.setManualTime(event.target.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold">Technician</span>
            <BookingSelect
              ariaLabel="Manual technician"
              value={props.technicianId}
              onChange={props.setTechnicianId}
              placeholder="Select technician"
              options={props.manualTechnicians.map((technician) => {
                const qualifiedCount = technician.serviceTypes.filter(
                  (service) => props.serviceIds.includes(service.id)
                ).length
                return {
                  value: technician.id,
                  label: `${technician.name} · ${qualifiedCount}/${props.serviceIds.length} qualified`,
                }
              })}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold">
              Service bay
            </span>
            <BookingSelect
              ariaLabel="Manual service bay"
              value={props.bayId}
              onChange={props.setBayId}
              placeholder="Select service bay"
              options={props.manualServiceBays.map((bay) => ({
                value: bay.id,
                label: bay.label,
              }))}
            />
          </label>
        </div>
      )}
    </div>
  )
}

function BookingSelect({
  ariaLabel,
  value,
  onChange,
  placeholder,
  options,
}: {
  ariaLabel: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <Select
      items={options}
      value={value || null}
      onValueChange={(nextValue) => onChange(nextValue ?? "")}
    >
      <SelectTrigger className="w-full" aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="start">
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function emptyReasonMessage(reason: ApiAvailabilityEmptyReason | null) {
  switch (reason) {
    case "NO_QUALIFIED_TECHNICIAN":
      return "No technician is recorded as qualified for every selected service."
    case "NO_SERVICE_BAY":
      return "This dealership has no configured service bay."
    case "DURATION_EXCEEDS_OPERATING_HOURS":
      return "The combined duration is longer than the dealership operating day."
    case "NO_REMAINING_START_TIME":
      return "No remaining start time can finish before 17:00."
    case "VEHICLE_UNAVAILABLE":
      return "The vehicle is occupied for every eligible start."
    case "NO_RESOURCE_CAPACITY":
      return "Technician or service-bay capacity is unavailable for every eligible start."
    default:
      return "Try another date, dealership, or service selection."
  }
}
