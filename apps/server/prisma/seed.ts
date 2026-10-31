import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the seed command.');
}

const ids = {
  customers: {
    alice: '00000001-0000-4000-8000-000000000001',
    minh: '00000001-0000-4000-8000-000000000002',
    noVehicle: '00000001-0000-4000-8000-000000000003',
  },
  vehicles: {
    corolla: '00000002-0000-4000-8000-000000000001',
    ranger: '00000002-0000-4000-8000-000000000002',
    city: '00000002-0000-4000-8000-000000000003',
  },
  dealerships: {
    hcm: '00000003-0000-4000-8000-000000000001',
    hanoi: '00000003-0000-4000-8000-000000000002',
  },
  services: {
    oil: '00000004-0000-4000-8000-000000000001',
    tires: '00000004-0000-4000-8000-000000000002',
    brakes: '00000004-0000-4000-8000-000000000003',
    full: '00000004-0000-4000-8000-000000000004',
  },
  technicians: {
    an: '00000006-0000-4000-8000-000000000001',
    binh: '00000006-0000-4000-8000-000000000002',
    chi: '00000006-0000-4000-8000-000000000003',
    dung: '00000006-0000-4000-8000-000000000004',
    giang: '00000006-0000-4000-8000-000000000005',
  },
  bays: {
    hcmA: '00000008-0000-4000-8000-000000000001',
    hcmB: '00000008-0000-4000-8000-000000000002',
    hanoiA: '00000008-0000-4000-8000-000000000003',
    hanoiB: '00000008-0000-4000-8000-000000000004',
  },
} as const;

function stableId(group: number, sequence: number): string {
  return `${String(group).padStart(8, '0')}-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}

function serviceId(sequence: number): string {
  return stableId(4, sequence);
}

const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool, { schema: 'public' }),
});

try {
  await prisma.$transaction(async (tx) => {
    const customers = [
      {
        id: ids.customers.alice,
        name: 'Alice Nguyen',
        phone: '+84912345678',
      },
      { id: ids.customers.minh, name: 'Minh Tran', phone: '+84903456789' },
      { id: ids.customers.noVehicle, name: 'Lan Pham', phone: '+84987654321' },
      ...[
        'Bao Le',
        'Chau Pham',
        'Duc Nguyen',
        'Ha Tran',
        'Hanh Vo',
        'Hoang Bui',
        'Huong Do',
        'Khoa Le',
        'Linh Nguyen',
        'Mai Pham',
        'Nam Tran',
        'Ngoc Vo',
        'Phuc Bui',
        'Quang Do',
        'Thao Le',
        'Trang Nguyen',
        'Tuan Pham',
      ].map((name, index) => ({
        id: stableId(1, index + 4),
        name,
        phone: `+849200000${String(index + 4).padStart(2, '0')}`,
      })),
    ];
    for (const customer of customers) {
      await tx.customer.upsert({
        where: { id: customer.id },
        update: { name: customer.name, phone: customer.phone },
        create: customer,
      });
    }

    const vehicles = [
      {
        id: ids.vehicles.corolla,
        customerId: ids.customers.alice,
        registrationNumber: '51A-123.45',
        registrationNumberNormalized: '51A12345',
        make: 'Toyota',
        model: 'Corolla',
      },
      {
        id: ids.vehicles.ranger,
        customerId: ids.customers.alice,
        registrationNumber: '51C-456.78',
        registrationNumberNormalized: '51C45678',
        make: 'Ford',
        model: 'Ranger',
      },
      {
        id: ids.vehicles.city,
        customerId: ids.customers.minh,
        registrationNumber: '30A-789.01',
        registrationNumberNormalized: '30A78901',
        make: 'Honda',
        model: 'City',
      },
      ...customers.slice(3).map((customer, index) => {
        const vehicleNumber = index + 4;
        const catalog = [
          ['Toyota', 'Camry'],
          ['Honda', 'CR-V'],
          ['Ford', 'Everest'],
          ['Mazda', 'CX-5'],
          ['Hyundai', 'Tucson'],
        ] as const;
        const [make, model] = catalog[index % catalog.length];
        const registrationNumber = `51D-${String(vehicleNumber).padStart(5, '0')}`;
        return {
          id: stableId(2, vehicleNumber),
          customerId: customer.id,
          registrationNumber,
          registrationNumberNormalized: registrationNumber.replace(
            /[^A-Z0-9]/g,
            '',
          ),
          make,
          model,
        };
      }),
    ];
    for (const vehicle of vehicles) {
      await tx.vehicle.upsert({
        where: { id: vehicle.id },
        update: vehicle,
        create: vehicle,
      });
    }

    const dealerships = [
      { id: ids.dealerships.hcm, name: 'Ho Chi Minh City Dealership' },
      { id: ids.dealerships.hanoi, name: 'Hanoi Dealership' },
      { id: stableId(3, 3), name: 'Da Nang Dealership' },
      { id: stableId(3, 4), name: 'Can Tho Dealership' },
    ];
    for (const dealership of dealerships) {
      await tx.dealership.upsert({
        where: { id: dealership.id },
        update: { name: dealership.name },
        create: dealership,
      });
    }

    const serviceTypes = [
      { id: ids.services.oil, name: 'Oil Change', durationMinutes: 30 },
      { id: ids.services.tires, name: 'Tire Service', durationMinutes: 60 },
      {
        id: ids.services.brakes,
        name: 'Brake Inspection',
        durationMinutes: 90,
      },
      { id: ids.services.full, name: 'Full Service', durationMinutes: 120 },
      { id: serviceId(5), name: 'Battery Service', durationMinutes: 30 },
      {
        id: serviceId(6),
        name: 'Air Conditioning Service',
        durationMinutes: 60,
      },
      { id: serviceId(7), name: 'Wheel Alignment', durationMinutes: 60 },
      { id: serviceId(8), name: 'Engine Diagnostics', durationMinutes: 60 },
      {
        id: serviceId(9),
        name: 'Transmission Service',
        durationMinutes: 120,
      },
      { id: serviceId(10), name: 'Coolant Service', durationMinutes: 30 },
      {
        id: serviceId(11),
        name: 'Suspension Inspection',
        durationMinutes: 90,
      },
      { id: serviceId(12), name: 'Exhaust Inspection', durationMinutes: 60 },
      { id: serviceId(13), name: 'Vehicle Detailing', durationMinutes: 120 },
      { id: serviceId(14), name: 'Safety Inspection', durationMinutes: 60 },
      {
        id: serviceId(15),
        name: 'Windscreen Replacement',
        durationMinutes: 90,
      },
    ];
    for (const serviceType of serviceTypes) {
      await tx.serviceType.upsert({
        where: { id: serviceType.id },
        update: serviceType,
        create: serviceType,
      });
    }

    const technicians = [
      {
        id: ids.technicians.an,
        dealershipId: ids.dealerships.hcm,
        name: 'An Nguyen',
      },
      {
        id: ids.technicians.binh,
        dealershipId: ids.dealerships.hcm,
        name: 'Binh Tran',
      },
      {
        id: ids.technicians.chi,
        dealershipId: stableId(3, 3),
        name: 'Chi Le',
      },
      {
        id: ids.technicians.dung,
        dealershipId: ids.dealerships.hanoi,
        name: 'Dung Pham',
      },
      {
        id: ids.technicians.giang,
        dealershipId: ids.dealerships.hanoi,
        name: 'Giang Vo',
      },
      ...[
        ['Hai Dang', 3],
        ['Hieu Phan', 1],
        ['Long Ho', 1],
        ['Manh Truong', 1],
        ['Phong Ngo', 2],
        ['Son Ly', 2],
        ['Viet Dao', 2],
        ['Anh Do', 3],
        ['Cuong Bui', 3],
        ['Dat Le', 3],
        ['Khanh Nguyen', 4],
        ['Lam Tran', 4],
        ['Quan Pham', 4],
        ['Thanh Vu', 4],
        ['Trung Hoang', 4],
      ].map(([name, dealershipSequence], index) => ({
        id: stableId(6, index + 6),
        dealershipId: stableId(3, dealershipSequence as number),
        name: name as string,
      })),
    ];
    for (const technician of technicians) {
      await tx.technician.upsert({
        where: { id: technician.id },
        update: technician,
        create: technician,
      });
    }

    const serviceBays = [
      { id: ids.bays.hcmA, dealershipId: ids.dealerships.hcm, label: 'Bay A' },
      { id: ids.bays.hcmB, dealershipId: ids.dealerships.hcm, label: 'Bay B' },
      {
        id: ids.bays.hanoiA,
        dealershipId: ids.dealerships.hanoi,
        label: 'Bay A',
      },
      {
        id: ids.bays.hanoiB,
        dealershipId: ids.dealerships.hanoi,
        label: 'Bay B',
      },
      { id: stableId(8, 5), dealershipId: ids.dealerships.hcm, label: 'Bay C' },
      { id: stableId(8, 6), dealershipId: ids.dealerships.hcm, label: 'Bay D' },
      {
        id: stableId(8, 7),
        dealershipId: ids.dealerships.hanoi,
        label: 'Bay C',
      },
      {
        id: stableId(8, 8),
        dealershipId: ids.dealerships.hanoi,
        label: 'Bay D',
      },
      ...dealerships.slice(2).flatMap((dealership, dealershipIndex) =>
        ['Bay A', 'Bay B', 'Bay C', 'Bay D'].map((label, bayIndex) => ({
          id: stableId(8, 9 + dealershipIndex * 4 + bayIndex),
          dealershipId: dealership.id,
          label,
        })),
      ),
    ];
    for (const serviceBay of serviceBays) {
      await tx.serviceBay.upsert({
        where: { id: serviceBay.id },
        update: serviceBay,
        create: serviceBay,
      });
    }

    await tx.technicianServiceType.deleteMany({
      where: { technicianId: { in: technicians.map(({ id }) => id) } },
    });
    await tx.technicianServiceType.createMany({
      data: [
        [ids.technicians.an, [1, 2, 3]],
        [ids.technicians.binh, [1, 3]],
        [ids.technicians.chi, [1]],
        [ids.technicians.dung, [1, 2, 4]],
        [ids.technicians.giang, [1, 4]],
        [stableId(6, 6), [5, 6, 7]],
        [stableId(6, 7), [8, 9]],
        [stableId(6, 8), [10, 11]],
        [stableId(6, 9), [12, 13]],
        [stableId(6, 10), [14, 15]],
        [stableId(6, 11), [2, 5, 8]],
        [stableId(6, 12), [4, 6, 9]],
        [stableId(6, 13), [2, 4, 5]],
        [stableId(6, 14), [3, 6, 7]],
        [stableId(6, 15), [8, 9, 10]],
        [stableId(6, 16), [11, 12]],
        [stableId(6, 17), [13, 14, 15]],
        [stableId(6, 18), [1, 5, 10]],
        [stableId(6, 19), [2, 7, 11]],
        [stableId(6, 20), [4, 8, 12, 15]],
      ].flatMap(([technicianId, serviceNumbers]) =>
        (serviceNumbers as number[]).map((serviceNumber) => ({
          technicianId: technicianId as string,
          serviceTypeId: serviceId(serviceNumber),
        })),
      ),
    });

  });

  console.log('Seeded USS reference data.');
} finally {
  await prisma.$disconnect();
  await pool.end();
}
