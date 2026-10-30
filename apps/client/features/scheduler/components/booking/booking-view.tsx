import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleUserRound,
  LoaderCircle,
  UserRound,
  Wrench,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { AvailabilityTable } from "@/features/scheduler/components/booking/availability-table"
import type { BookingViewProps } from "@/features/scheduler/components/booking/booking-types"
import { CustomerVehiclePanel } from "@/features/scheduler/components/booking/customer-vehicle-panel"
import { ServiceTable } from "@/features/scheduler/components/booking/service-table"
import { SummaryRow } from "@/features/scheduler/components/scheduler-fields"
import { minutesLabel } from "@/features/scheduler/scheduler-format"

export function BookingView(props: BookingViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <button
            onClick={props.onClose}
            className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="size-3.5" /> Back to appointments
          </button>
          <h1 className="text-xl font-bold tracking-tight">
            Create service appointment
          </h1>
          <p className="text-sm text-slate-500">
            Staff workspace · search, select, and confirm on one screen
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-4">
          <CustomerVehiclePanel {...props} />
          <ServiceTable {...props} />
          <AvailabilityTable {...props} />
        </main>
        <BookingSummary {...props} />
      </div>
    </div>
  )
}

function BookingSummary(props: BookingViewProps) {
  const technician = props.selectedSlot?.technicians.find(
    (item) => item.id === props.technicianId
  )
  const bay = props.selectedSlot?.serviceBays.find(
    (item) => item.id === props.bayId
  )

  return (
    <aside className="h-fit rounded-xl border bg-white p-4 xl:sticky xl:top-20">
      <h2 className="text-sm font-semibold">Booking summary</h2>
      <div className="mt-4 space-y-4 text-xs">
        <SummaryRow
          icon={CircleUserRound}
          label="Customer"
          value={props.selectedCustomer?.name ?? "Not selected"}
          detail={props.selectedCustomer?.phone}
        />
        <SummaryRow
          icon={UserRound}
          label="Vehicle"
          value={props.selectedVehicle?.registrationNumber ?? "Not selected"}
          detail={
            props.selectedVehicle
              ? `${props.selectedVehicle.make} ${props.selectedVehicle.model}`
              : undefined
          }
        />
        <SummaryRow
          icon={Building2}
          label="Dealership"
          value={props.dealership.name || "Not selected"}
        />
        <SummaryRow
          icon={Wrench}
          label="Services"
          value={
            props.selectedServices.length
              ? props.selectedServices.map((service) => service.name).join(", ")
              : "Not selected"
          }
          detail={
            props.totalDuration
              ? `${minutesLabel(props.totalDuration)} total`
              : undefined
          }
        />
        <SummaryRow
          icon={CalendarDays}
          label="Schedule"
          value={
            props.selectedSlot
              ? `${props.selectedDate} · ${vietnamTime(props.selectedSlot.scheduledStart)}`
              : "Not selected"
          }
          detail={
            technician && bay ? `${technician.name} · ${bay.label}` : undefined
          }
        />
      </div>
      <Button
        className="mt-5 w-full bg-blue-600 hover:bg-blue-700"
        disabled={!props.canConfirm || props.isConfirming}
        onClick={props.onConfirm}
      >
        {props.isConfirming && <LoaderCircle className="animate-spin" />}
        {props.isConfirming ? "Confirming…" : "Confirm appointment"}
      </Button>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        Resources are checked again atomically before saving.
      </p>
    </aside>
  )
}

function vietnamTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value))
}
