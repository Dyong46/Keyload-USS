import { api } from "@/lib/api"

export type ApiHealth = {
  status: "ok"
  database: "up"
  timestamp: string
  demoStaff: {
    id: string
    displayName: string
  }
}

export type ApiCustomer = {
  id: string
  name: string
  phone: string
}

export type CreateCustomerRequest = Pick<ApiCustomer, "name" | "phone">
export type UpdateCustomerRequest = Partial<CreateCustomerRequest>

export type CreateVehicleRequest = Pick<
  ApiVehicle,
  "registrationNumber" | "make" | "model"
>

export type ApiVehicle = {
  id: string
  customerId: string
  registrationNumber: string
  make: string
  model: string
}

export type ApiDealership = {
  id: string
  name: string
}

export type ApiServiceType = {
  id: string
  name: string
  durationMinutes: number
}

export type CreateServiceTypeRequest = Pick<
  ApiServiceType,
  "name" | "durationMinutes"
>
export type UpdateServiceTypeRequest = Partial<CreateServiceTypeRequest>

export type ApiTechnicianManagement = {
  id: string
  name: string
  dealership: ApiDealership
  serviceTypes: ApiServiceType[]
}

export type CreateTechnicianRequest = {
  name: string
  dealershipId: string
  serviceTypeIds: string[]
}

export type UpdateTechnicianRequest = Pick<
  CreateTechnicianRequest,
  "name" | "dealershipId"
>

export type ApiAppointmentStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED"

export type ApiAppointment = {
  id: string
  customer: ApiCustomer
  vehicle: ApiVehicle
  dealership: ApiDealership
  services: Array<{
    serviceTypeId: string
    name: string
    durationMinutes: number
  }>
  totalDurationMinutes: number
  technician: {
    id: string
    name: string
    dealershipId: string
  }
  serviceBay: {
    id: string
    label: string
    dealershipId: string
  }
  scheduledStart: string
  scheduledEnd: string
  status: ApiAppointmentStatus
  createdAt: string
  updatedAt: string
  cancelledAt: string | null
  actualCompletedAt: string | null
}

export type AppointmentListParams = {
  page: number
  pageSize: number
  search?: string
  status?: ApiAppointmentStatus
}

export type ApiAppointmentList = {
  items: ApiAppointment[]
  page: number
  pageSize: number
  total: number
}

export type ApiAvailableTechnician = {
  id: string
  name: string
  dealershipId: string
}

export type ApiAvailableServiceBay = {
  id: string
  label: string
  dealershipId: string
}

export type ApiAvailabilityEmptyReason =
  | "NO_QUALIFIED_TECHNICIAN"
  | "NO_SERVICE_BAY"
  | "DURATION_EXCEEDS_OPERATING_HOURS"
  | "NO_REMAINING_START_TIME"
  | "VEHICLE_UNAVAILABLE"
  | "NO_RESOURCE_CAPACITY"

export type ApiAvailabilitySlot = {
  scheduledStart: string
  scheduledEnd: string
  technicians: ApiAvailableTechnician[]
  serviceBays: ApiAvailableServiceBay[]
  suggestedTechnicianId: string
  suggestedServiceBayId: string
}

export type AvailabilityParams = {
  dealershipId: string
  vehicleId: string
  serviceIds: string[]
  date: string
}

export type ApiAvailability = {
  dealershipId: string
  vehicleId: string
  date: string
  timeZone: "Asia/Ho_Chi_Minh"
  generatedAt: string
  services: ApiServiceType[]
  totalDurationMinutes: number
  slots: ApiAvailabilitySlot[]
  emptyReason: ApiAvailabilityEmptyReason | null
}

export type CreateAppointmentRequest = {
  customerId: string
  vehicleId: string
  dealershipId: string
  serviceIds: string[]
  scheduledStart: string
  technicianId: string
  serviceBayId: string
}

export const schedulerApi = {
  health: (signal?: AbortSignal) => api.get<ApiHealth>("/health", { signal }),
  customers: (search: string, signal?: AbortSignal) =>
    api.get<ApiCustomer[]>("/customers", {
      signal,
      query: { search, limit: 10 },
    }),
  createCustomer: (body: CreateCustomerRequest) =>
    api.post<ApiCustomer>("/customers", body),
  updateCustomer: (id: string, body: UpdateCustomerRequest) =>
    api.patch<ApiCustomer>(`/customers/${encodeURIComponent(id)}`, body),
  vehicles: (customerId: string, signal?: AbortSignal) =>
    api.get<ApiVehicle[]>(
      `/customers/${encodeURIComponent(customerId)}/vehicles`,
      { signal }
    ),
  createVehicle: (customerId: string, body: CreateVehicleRequest) =>
    api.post<ApiVehicle>(
      `/customers/${encodeURIComponent(customerId)}/vehicles`,
      body
    ),
  dealerships: (signal?: AbortSignal) =>
    api.get<ApiDealership[]>("/dealerships", { signal }),
  serviceBays: (dealershipId: string, signal?: AbortSignal) =>
    api.get<ApiAvailableServiceBay[]>(
      `/dealerships/${encodeURIComponent(dealershipId)}/service-bays`,
      { signal }
    ),
  serviceTypes: (signal?: AbortSignal) =>
    api.get<ApiServiceType[]>("/service-types", { signal }),
  createServiceType: (body: CreateServiceTypeRequest) =>
    api.post<ApiServiceType>("/service-types", body),
  updateServiceType: (id: string, body: UpdateServiceTypeRequest) =>
    api.patch<ApiServiceType>(`/service-types/${encodeURIComponent(id)}`, body),
  technicians: (dealershipId?: string, signal?: AbortSignal) =>
    api.get<ApiTechnicianManagement[]>("/technicians", {
      signal,
      query: { dealershipId },
    }),
  createTechnician: (body: CreateTechnicianRequest) =>
    api.post<ApiTechnicianManagement>("/technicians", body),
  updateTechnician: (id: string, body: UpdateTechnicianRequest) =>
    api.patch<ApiTechnicianManagement>(
      `/technicians/${encodeURIComponent(id)}`,
      body
    ),
  attachTechnicianServiceType: (technicianId: string, serviceTypeId: string) =>
    api.put<ApiTechnicianManagement>(
      `/technicians/${encodeURIComponent(technicianId)}/service-types/${encodeURIComponent(serviceTypeId)}`
    ),
  detachTechnicianServiceType: (technicianId: string, serviceTypeId: string) =>
    api.delete<ApiTechnicianManagement>(
      `/technicians/${encodeURIComponent(technicianId)}/service-types/${encodeURIComponent(serviceTypeId)}`
    ),
  appointments: (params: AppointmentListParams, signal?: AbortSignal) =>
    api.get<ApiAppointmentList>("/appointments", {
      signal,
      query: params,
    }),
  availability: (params: AvailabilityParams, signal?: AbortSignal) =>
    api.get<ApiAvailability>("/availability", {
      signal,
      query: params,
    }),
  createAppointment: (body: CreateAppointmentRequest, idempotencyKey: string) =>
    api.post<ApiAppointment>("/appointments", body, {
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  cancelAppointment: (id: string) =>
    api.post<ApiAppointment>(`/appointments/${encodeURIComponent(id)}/cancel`),
  completeAppointment: (id: string) =>
    api.post<ApiAppointment>(
      `/appointments/${encodeURIComponent(id)}/complete`
    ),
}

export const schedulerQueryKeys = {
  health: ["scheduler", "health"] as const,
  customersRoot: ["scheduler", "customers"] as const,
  customers: (search: string) =>
    [...schedulerQueryKeys.customersRoot, { search }] as const,
  vehicles: (customerId: string) =>
    ["scheduler", "customers", customerId, "vehicles"] as const,
  dealerships: ["scheduler", "dealerships"] as const,
  serviceBaysRoot: ["scheduler", "service-bays"] as const,
  serviceBays: (dealershipId: string) =>
    [...schedulerQueryKeys.serviceBaysRoot, { dealershipId }] as const,
  serviceTypes: ["scheduler", "service-types"] as const,
  techniciansRoot: ["scheduler", "technicians"] as const,
  technicians: (dealershipId?: string) =>
    [...schedulerQueryKeys.techniciansRoot, { dealershipId }] as const,
  appointmentsRoot: ["scheduler", "appointments"] as const,
  appointments: (params: AppointmentListParams) =>
    [...schedulerQueryKeys.appointmentsRoot, params] as const,
  availabilityRoot: ["scheduler", "availability"] as const,
  availability: (params: AvailabilityParams) =>
    [...schedulerQueryKeys.availabilityRoot, params] as const,
}
