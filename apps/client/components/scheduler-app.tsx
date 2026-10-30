"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AppointmentsView } from "@/features/scheduler/components/appointments-view"
import { BookingReferenceState } from "@/features/scheduler/components/booking/booking-reference-state"
import { BookingView } from "@/features/scheduler/components/booking/booking-view"
import { SchedulerShell } from "@/features/scheduler/components/scheduler-shell"
import {
  type ApiAvailabilitySlot,
  type ApiAppointmentStatus,
  type ApiCustomer,
  type ApiVehicle,
} from "@/features/scheduler/api/scheduler-api"
import { useAppointments } from "@/features/scheduler/hooks/use-appointments"
import { useBooking } from "@/features/scheduler/hooks/use-booking"
import { useCustomerLookup } from "@/features/scheduler/hooks/use-customer-lookup"
import {
  useSchedulerReferenceData,
  type SchedulerDealership,
} from "@/features/scheduler/hooks/use-scheduler-reference-data"

type View = "appointments" | "booking"

const EMPTY_DEALERSHIP: SchedulerDealership = {
  id: "",
  name: "Loading dealership…",
}

function vietnamDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value)
}

export function SchedulerApp({
  initialView = "appointments",
}: {
  initialView?: Extract<View, "appointments" | "booking">
}) {
  const router = useRouter()
  const [view, setView] = React.useState<View>(initialView)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<
    "ALL" | ApiAppointmentStatus
  >("ALL")
  const [appointmentPage, setAppointmentPage] = React.useState(1)
  const [customerSearch, setCustomerSearch] = React.useState("")
  const [selectedCustomer, setSelectedCustomer] = React.useState<ApiCustomer>()
  const [selectedVehicle, setSelectedVehicle] = React.useState<ApiVehicle>()
  const [dealershipId, setDealershipId] = React.useState("")
  const [serviceIds, setServiceIds] = React.useState<string[]>([])
  const [selectedDate, setSelectedDate] = React.useState(() =>
    vietnamDate(new Date())
  )
  const [selectedTime, setSelectedTime] = React.useState("")
  const [technicianId, setTechnicianId] = React.useState("")
  const [bayId, setBayId] = React.useState("")
  const deferredSearch = useDebouncedValue(search.trim(), 300)
  const deferredCustomerSearch = useDebouncedValue(customerSearch.trim(), 250)
  const appointmentParams = React.useMemo(
    () => ({
      page: appointmentPage,
      pageSize: 20,
      search: deferredSearch || undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
    }),
    [appointmentPage, deferredSearch, statusFilter]
  )
  const { appointmentsQuery, runAction, pendingAction } =
    useAppointments(appointmentParams)

  const {
    healthQuery,
    dealerships,
    serviceTypes,
    referenceReady,
    referenceError,
    retryReferences,
  } = useSchedulerReferenceData()
  const {
    customersQuery,
    vehiclesQuery,
    createCustomer,
    createVehicle,
    creatingCustomer,
    creatingVehicle,
  } = useCustomerLookup(deferredCustomerSearch, selectedCustomer?.id)
  const dealership =
    dealerships.find((item) => item.id === dealershipId) ??
    dealerships[0] ??
    EMPTY_DEALERSHIP
  const selectedServices = serviceTypes.filter((service) =>
    serviceIds.includes(service.id)
  )
  const totalDuration = selectedServices.reduce(
    (total, service) => total + service.durationMinutes,
    0
  )
  const selectedVehicleId = selectedVehicle?.id
  const minimumDate = vietnamDate(
    healthQuery.data ? new Date(healthQuery.data.timestamp) : new Date()
  )
  const bookingDate = selectedDate < minimumDate ? minimumDate : selectedDate
  const availabilityParams = React.useMemo(
    () =>
      dealership.id && selectedVehicleId && serviceIds.length && bookingDate
        ? {
            dealershipId: dealership.id,
            vehicleId: selectedVehicleId,
            serviceIds: [...serviceIds].sort(),
            date: bookingDate,
          }
        : undefined,
    [bookingDate, dealership.id, selectedVehicleId, serviceIds]
  )
  const {
    availabilityQuery,
    confirmAppointment: createAppointment,
    isConfirming,
  } = useBooking({
    availabilityParams,
    onCreated: () => router.push("/"),
    onRecoverableConflict: () => {
      setSelectedTime("")
      setTechnicianId("")
      setBayId("")
    },
  })
  const availabilitySlots = availabilityQuery.data?.slots ?? []
  const selectedSlot = availabilitySlots.find(
    (slot) => slot.scheduledStart === selectedTime
  )
  function startBooking() {
    if (initialView === "appointments") {
      router.push("/appointments/new")
      return
    }

    if (!referenceReady) return
    const firstDealership = dealerships[0]
    setCustomerSearch("")
    setSelectedCustomer(undefined)
    setSelectedVehicle(undefined)
    setDealershipId(firstDealership.id)
    setServiceIds([])
    setSelectedTime("")
    setTechnicianId("")
    setBayId("")
    setView("booking")
  }

  function toggleService(serviceId: string) {
    setServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    )
    resetAvailabilitySelection()
  }

  function confirmAppointment() {
    if (
      !selectedCustomer ||
      !selectedVehicle ||
      !selectedSlot ||
      !technicianId ||
      !bayId
    ) {
      return
    }
    createAppointment({
      customerId: selectedCustomer.id,
      vehicleId: selectedVehicle.id,
      dealershipId: dealership.id,
      serviceIds,
      scheduledStart: selectedSlot.scheduledStart,
      technicianId,
      serviceBayId: bayId,
    })
  }

  function resetAvailabilitySelection() {
    setSelectedTime("")
    setTechnicianId("")
    setBayId("")
  }

  function selectSlot(slot: ApiAvailabilitySlot) {
    setSelectedTime(slot.scheduledStart)
    setTechnicianId(slot.suggestedTechnicianId)
    setBayId(slot.suggestedServiceBayId)
  }

  const canConfirm = Boolean(
    selectedCustomer &&
    selectedVehicle &&
    serviceIds.length &&
    selectedSlot?.technicians.some((item) => item.id === technicianId) &&
    selectedSlot.serviceBays.some((item) => item.id === bayId)
  )

  return (
    <SchedulerShell
      backendState={
        healthQuery.isSuccess
          ? "connected"
          : healthQuery.isError
            ? "unavailable"
            : "pending"
      }
      staffName={healthQuery.data?.demoStaff.displayName ?? "Dealership Staff"}
    >
      {view === "appointments" && (
        <AppointmentsView
          appointments={appointmentsQuery.data?.items ?? []}
          totalAppointments={appointmentsQuery.data?.total ?? 0}
          page={appointmentPage}
          pageSize={appointmentParams.pageSize}
          search={search}
          setSearch={(value) => {
            setSearch(value)
            setAppointmentPage(1)
          }}
          statusFilter={statusFilter}
          setStatusFilter={(status) => {
            setStatusFilter(status)
            setAppointmentPage(1)
          }}
          setPage={setAppointmentPage}
          onStartBooking={startBooking}
          onAppointmentAction={runAction}
          pendingAction={pendingAction}
          appointmentsPending={appointmentsQuery.isPending}
          appointmentsError={appointmentsQuery.isError}
          onRetryAppointments={() => void appointmentsQuery.refetch()}
          referenceReady={referenceReady}
          referenceError={referenceError}
          onRetryReferences={retryReferences}
        />
      )}

      {view === "booking" && !referenceReady && (
        <BookingReferenceState
          hasError={referenceError}
          onRetry={retryReferences}
        />
      )}

      {view === "booking" && referenceReady && (
        <BookingView
          canConfirm={canConfirm}
          onClose={() => router.push("/")}
          onConfirm={confirmAppointment}
          isConfirming={isConfirming}
          customerSearch={customerSearch}
          setCustomerSearch={setCustomerSearch}
          customerResults={customersQuery.data ?? []}
          customersPending={customersQuery.isFetching}
          selectedCustomer={selectedCustomer}
          selectCustomer={(customer) => {
            setSelectedCustomer(customer)
            setSelectedVehicle(undefined)
            setCustomerSearch("")
            resetAvailabilitySelection()
          }}
          createCustomer={createCustomer}
          creatingCustomer={creatingCustomer}
          vehicles={vehiclesQuery.data ?? []}
          vehiclesPending={vehiclesQuery.isFetching}
          selectedVehicle={selectedVehicle}
          selectVehicle={(vehicle) => {
            setSelectedVehicle(vehicle)
            resetAvailabilitySelection()
          }}
          createVehicle={createVehicle}
          creatingVehicle={creatingVehicle}
          dealershipId={dealership.id}
          setDealershipId={(id) => {
            setDealershipId(id)
            resetAvailabilitySelection()
          }}
          serviceIds={serviceIds}
          toggleService={toggleService}
          selectedDate={bookingDate}
          minimumDate={minimumDate}
          setSelectedDate={(date) => {
            setSelectedDate(date)
            resetAvailabilitySelection()
          }}
          selectedTime={selectedTime}
          selectSlot={selectSlot}
          technicianId={technicianId}
          setTechnicianId={setTechnicianId}
          bayId={bayId}
          setBayId={setBayId}
          dealerships={dealerships}
          serviceTypes={serviceTypes}
          dealership={dealership}
          selectedServices={selectedServices}
          totalDuration={totalDuration}
          availabilitySlots={availabilitySlots}
          selectedSlot={selectedSlot}
          availabilityPending={availabilityQuery.isPending}
          availabilityError={availabilityQuery.isError}
          retryAvailability={() => void availabilityQuery.refetch()}
        />
      )}
    </SchedulerShell>
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
