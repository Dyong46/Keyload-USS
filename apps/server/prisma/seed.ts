import 'dotenv/config';
import { createHash } from 'node:crypto';
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
  appointment: '00000009-0000-4000-8000-000000000001',
  requestKey: '00000010-0000-4000-8000-000000000001',
} as const;

function futureVietnamDate(daysAhead: number): string {
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
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
        dealershipId: ids.dealerships.hcm,
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
        [ids.technicians.an, ids.services.oil],
        [ids.technicians.an, ids.services.tires],
        [ids.technicians.an, ids.services.brakes],
        [ids.technicians.binh, ids.services.oil],
        [ids.technicians.binh, ids.services.brakes],
        [ids.technicians.chi, ids.services.oil],
        [ids.technicians.dung, ids.services.oil],
        [ids.technicians.dung, ids.services.tires],
        [ids.technicians.dung, ids.services.full],
        [ids.technicians.giang, ids.services.oil],
        [ids.technicians.giang, ids.services.full],
      ].map(([technicianId, serviceTypeId]) => ({
        technicianId,
        serviceTypeId,
      })),
    });

    const businessDate = futureVietnamDate(7);
    const scheduledStart = new Date(`${businessDate}T02:00:00.000Z`);
    const scheduledEnd = new Date(`${businessDate}T03:30:00.000Z`);
    const requestContent = {
      customerId: ids.customers.alice,
      vehicleId: ids.vehicles.corolla,
      dealershipId: ids.dealerships.hcm,
      serviceIds: [ids.services.oil, ids.services.tires],
      scheduledStart: scheduledStart.toISOString(),
      technicianId: ids.technicians.an,
      serviceBayId: ids.bays.hcmA,
    };
    const requestHash = createHash('sha256')
      .update(JSON.stringify(requestContent))
      .digest('hex');
    const appointmentData = {
      customerId: ids.customers.alice,
      vehicleId: ids.vehicles.corolla,
      dealershipId: ids.dealerships.hcm,
      technicianId: ids.technicians.an,
      serviceBayId: ids.bays.hcmA,
      status: 'CONFIRMED' as const,
      scheduledStart,
      scheduledEnd,
      totalDurationMinutes: 90,
      occupancyEnd: scheduledEnd,
      requestKey: ids.requestKey,
      requestHash,
      cancelledAt: null,
      actualCompletedAt: null,
    };
    await tx.appointment.upsert({
      where: { id: ids.appointment },
      update: {
        ...appointmentData,
        services: {
          deleteMany: {},
          create: [
            {
              serviceTypeId: ids.services.oil,
              name: 'Oil Change',
              durationMinutes: 30,
            },
            {
              serviceTypeId: ids.services.tires,
              name: 'Tire Service',
              durationMinutes: 60,
            },
          ],
        },
      },
      create: {
        id: ids.appointment,
        ...appointmentData,
        services: {
          create: [
            {
              serviceTypeId: ids.services.oil,
              name: 'Oil Change',
              durationMinutes: 30,
            },
            {
              serviceTypeId: ids.services.tires,
              name: 'Tire Service',
              durationMinutes: 60,
            },
          ],
        },
      },
    });
  });

  console.log(
    'Seeded USS reference data and one refreshable future appointment.',
  );
} finally {
  await prisma.$disconnect();
  await pool.end();
}
