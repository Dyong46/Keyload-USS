import type {
  ApiAvailabilitySlot,
  ApiAvailabilityEmptyReason,
  ApiAvailableServiceBay,
  ApiCustomer,
  ApiServiceType,
  ApiVehicle,
  ApiTechnicianManagement,
  CreateCustomerRequest,
  CreateVehicleRequest,
} from "@/features/scheduler/api/scheduler-api"
import type { SchedulerDealership } from "@/features/scheduler/hooks/use-scheduler-reference-data"

export type BookingViewProps = {
  onClose: () => void
  onConfirm: () => void
  canConfirm: boolean
  isConfirming: boolean
  customerSearch: string
  setCustomerSearch: (value: string) => void
  customerResults: ApiCustomer[]
  customersPending: boolean
  selectedCustomer?: ApiCustomer
  selectCustomer: (customer?: ApiCustomer) => void
  createCustomer: (body: CreateCustomerRequest) => Promise<ApiCustomer>
  creatingCustomer: boolean
  vehicles: ApiVehicle[]
  vehiclesPending: boolean
  selectedVehicle?: ApiVehicle
  selectVehicle: (vehicle?: ApiVehicle) => void
  createVehicle: (body: CreateVehicleRequest) => Promise<ApiVehicle>
  creatingVehicle: boolean
  dealershipId: string
  setDealershipId: (value: string) => void
  dealership: SchedulerDealership
  dealerships: SchedulerDealership[]
  serviceIds: string[]
  toggleService: (id: string) => void
  serviceTypes: ApiServiceType[]
  selectedServices: ApiServiceType[]
  totalDuration: number
  selectedDate: string
  minimumDate: string
  setSelectedDate: (value: string) => void
  selectedTime: string
  selectSlot: (slot: ApiAvailabilitySlot) => void
  technicianId: string
  setTechnicianId: (value: string) => void
  bayId: string
  setBayId: (value: string) => void
  availabilitySlots: ApiAvailabilitySlot[]
  selectedSlot?: ApiAvailabilitySlot
  availabilityPending: boolean
  availabilityError: boolean
  retryAvailability: () => void
  availabilityEmptyReason: ApiAvailabilityEmptyReason | null
  allocationMode: "automatic" | "manual"
  enableManualAllocation: () => void
  useSuggestedAllocation: () => void
  manualTime: string
  setManualTime: (value: string) => void
  manualTechnicians: ApiTechnicianManagement[]
  manualServiceBays: ApiAvailableServiceBay[]
  manualResourcesPending: boolean
  manualResourcesError: boolean
  retryManualResources: () => void
}
