export type Vehicle = {
  id: string
  registrationNumber: string
  make: string
  model: string
}

export type Customer = {
  id: string
  name: string
  phone: string
  vehicles: Vehicle[]
}

export type ServiceType = {
  id: string
  name: string
  description: string
  durationMinutes: number
}

export type Technician = {
  id: string
  name: string
  initials: string
  serviceNames: string[]
}

export type ServiceBay = {
  id: string
  label: string
}

export type Dealership = {
  id: string
  name: string
  address: string
  technicians: Technician[]
  bays: ServiceBay[]
}

export const CUSTOMERS: Customer[] = [
  {
    id: "customer-alice",
    name: "Alice Nguyen",
    phone: "+84 912 345 678",
    vehicles: [
      {
        id: "vehicle-corolla",
        registrationNumber: "51A-123.45",
        make: "Toyota",
        model: "Corolla",
      },
      {
        id: "vehicle-ranger",
        registrationNumber: "51C-456.78",
        make: "Ford",
        model: "Ranger",
      },
    ],
  },
  {
    id: "customer-minh",
    name: "Minh Tran",
    phone: "+84 903 456 789",
    vehicles: [
      {
        id: "vehicle-city",
        registrationNumber: "30A-789.01",
        make: "Honda",
        model: "City",
      },
    ],
  },
]

export const SERVICES: ServiceType[] = [
  {
    id: "service-oil",
    name: "Oil Change",
    description: "Engine oil and filter replacement",
    durationMinutes: 30,
  },
  {
    id: "service-tires",
    name: "Tire Service",
    description: "Rotation, pressure and tread inspection",
    durationMinutes: 60,
  },
  {
    id: "service-brakes",
    name: "Brake Inspection",
    description: "Pads, discs and brake fluid check",
    durationMinutes: 90,
  },
  {
    id: "service-full",
    name: "Full Service",
    description: "Complete scheduled vehicle maintenance",
    durationMinutes: 120,
  },
]

export const DEALERSHIPS: Dealership[] = [
  {
    id: "dealer-hcm",
    name: "Ho Chi Minh City Dealership",
    address: "12 Nguyen Van Linh, District 7",
    technicians: [
      {
        id: "tech-an",
        name: "An Nguyen",
        initials: "AN",
        serviceNames: ["Oil Change", "Tire Service", "Brake Inspection"],
      },
      {
        id: "tech-binh",
        name: "Binh Tran",
        initials: "BT",
        serviceNames: ["Oil Change", "Brake Inspection"],
      },
      {
        id: "tech-chi",
        name: "Chi Le",
        initials: "CL",
        serviceNames: ["Oil Change"],
      },
    ],
    bays: [
      { id: "bay-hcm-a", label: "Bay A" },
      { id: "bay-hcm-b", label: "Bay B" },
    ],
  },
  {
    id: "dealer-hanoi",
    name: "Hanoi Dealership",
    address: "88 Pham Hung, Nam Tu Liem",
    technicians: [
      {
        id: "tech-dung",
        name: "Dung Pham",
        initials: "DP",
        serviceNames: ["Oil Change", "Tire Service", "Full Service"],
      },
      {
        id: "tech-giang",
        name: "Giang Vo",
        initials: "GV",
        serviceNames: ["Oil Change", "Full Service"],
      },
    ],
    bays: [
      { id: "bay-hanoi-a", label: "Bay A" },
      { id: "bay-hanoi-b", label: "Bay B" },
    ],
  },
]
