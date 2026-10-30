import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/common/configure-app.js';
import { PrismaService } from '../src/database/prisma.service.js';

const ids = {
  customers: {
    alice: '00000001-0000-4000-8000-000000000001',
    minh: '00000001-0000-4000-8000-000000000002',
  },
  vehicles: {
    ranger: '00000002-0000-4000-8000-000000000002',
    city: '00000002-0000-4000-8000-000000000003',
  },
  dealership: '00000003-0000-4000-8000-000000000002',
  services: {
    oil: '00000004-0000-4000-8000-000000000001',
    full: '00000004-0000-4000-8000-000000000004',
  },
  technicians: {
    dung: '00000006-0000-4000-8000-000000000004',
    giang: '00000006-0000-4000-8000-000000000005',
  },
  bays: {
    a: '00000008-0000-4000-8000-000000000003',
    b: '00000008-0000-4000-8000-000000000004',
  },
  keys: {
    create: '10000010-0000-4000-8000-000000000001',
    resourceConflict: '10000010-0000-4000-8000-000000000002',
    vehicleConflict: '10000010-0000-4000-8000-000000000003',
    concurrent: '10000010-0000-4000-8000-000000000004',
    raceA: '10000010-0000-4000-8000-000000000006',
    raceB: '10000010-0000-4000-8000-000000000007',
  },
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

describe('POST /appointments (PostgreSQL integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const businessDate = futureVietnamDate(8);
  const baseBody = {
    customerId: ids.customers.alice,
    vehicleId: ids.vehicles.ranger,
    dealershipId: ids.dealership,
    serviceIds: [ids.services.oil, ids.services.full],
    scheduledStart: `${businessDate}T13:00:00+07:00`,
    technicianId: ids.technicians.dung,
    serviceBayId: ids.bays.a,
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.appointment.deleteMany({
      where: { requestKey: { in: Object.values(ids.keys) } },
    });
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: { requestKey: { in: Object.values(ids.keys) } },
    });
    await app.close();
  });

  it('creates once, then replays canonical equivalent content', async () => {
    const created = await request(app.getHttpServer())
      .post('/appointments')
      .set('Idempotency-Key', ids.keys.create)
      .send(baseBody)
      .expect(201);

    expect(created.body).toMatchObject({
      customer: { id: ids.customers.alice },
      vehicle: { id: ids.vehicles.ranger },
      dealership: { id: ids.dealership },
      technician: { id: ids.technicians.dung },
      serviceBay: { id: ids.bays.a },
      totalDurationMinutes: 150,
      status: 'CONFIRMED',
      cancelledAt: null,
      actualCompletedAt: null,
    });
    expect(
      created.body.services.map(
        ({ serviceTypeId }: { serviceTypeId: string }) => serviceTypeId,
      ),
    ).toEqual([ids.services.oil, ids.services.full]);

    const replayed = await request(app.getHttpServer())
      .post('/appointments')
      .set('Idempotency-Key', ids.keys.create.toUpperCase())
      .send({ ...baseBody, serviceIds: [...baseBody.serviceIds].reverse() })
      .expect(200);

    expect(replayed.body.id).toBe(created.body.id);
    expect(
      await prisma.appointment.count({
        where: { requestKey: ids.keys.create },
      }),
    ).toBe(1);
  });

  it('rejects changed content with the same idempotency key', async () => {
    const response = await request(app.getHttpServer())
      .post('/appointments')
      .set('Idempotency-Key', ids.keys.create)
      .send({ ...baseBody, serviceBayId: ids.bays.b })
      .expect(409);

    expect(response.body.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('distinguishes resource and vehicle conflicts', async () => {
    const resourceConflict = await request(app.getHttpServer())
      .post('/appointments')
      .set('Idempotency-Key', ids.keys.resourceConflict)
      .send({
        ...baseBody,
        customerId: ids.customers.minh,
        vehicleId: ids.vehicles.city,
      })
      .expect(409);
    expect(resourceConflict.body.code).toBe('RESOURCE_CONFLICT');

    const vehicleConflict = await request(app.getHttpServer())
      .post('/appointments')
      .set('Idempotency-Key', ids.keys.vehicleConflict)
      .send({
        ...baseBody,
        technicianId: ids.technicians.giang,
        serviceBayId: ids.bays.b,
      })
      .expect(409);
    expect(vehicleConflict.body.code).toBe('VEHICLE_CONFLICT');
  });

  it('creates at most one appointment for concurrent copies of a request', async () => {
    const body = {
      ...baseBody,
      serviceIds: [ids.services.oil],
      scheduledStart: `${businessDate}T15:30:00+07:00`,
    };
    const responses = await Promise.all([
      request(app.getHttpServer())
        .post('/appointments')
        .set('Idempotency-Key', ids.keys.concurrent)
        .send(body),
      request(app.getHttpServer())
        .post('/appointments')
        .set('Idempotency-Key', ids.keys.concurrent)
        .send(body),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 201]);
    expect(responses[0].body.id).toBe(responses[1].body.id);
    expect(
      await prisma.appointment.count({
        where: { requestKey: ids.keys.concurrent },
      }),
    ).toBe(1);
  });

  it('lets the database prevent concurrent resource double booking', async () => {
    const scheduledStart = `${businessDate}T16:00:00+07:00`;
    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/appointments')
        .set('Idempotency-Key', ids.keys.raceA)
        .send({
          ...baseBody,
          serviceIds: [ids.services.oil],
          scheduledStart,
        }),
      request(app.getHttpServer())
        .post('/appointments')
        .set('Idempotency-Key', ids.keys.raceB)
        .send({
          ...baseBody,
          customerId: ids.customers.minh,
          vehicleId: ids.vehicles.city,
          serviceIds: [ids.services.oil],
          scheduledStart,
        }),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    const conflict = first.status === 409 ? first : second;
    expect(conflict.body.code).toBe('RESOURCE_CONFLICT');
    expect(
      await prisma.appointment.count({
        where: { requestKey: { in: [ids.keys.raceA, ids.keys.raceB] } },
      }),
    ).toBe(1);
  });

  it('validates the required idempotency key and ownership', async () => {
    const missingKey = await request(app.getHttpServer())
      .post('/appointments')
      .send(baseBody)
      .expect(400);
    expect(missingKey.body.code).toBe('VALIDATION_ERROR');

    const ownership = await request(app.getHttpServer())
      .post('/appointments')
      .set('Idempotency-Key', '10000010-0000-4000-8000-000000000005')
      .send({ ...baseBody, customerId: ids.customers.minh })
      .expect(400);
    expect(ownership.body.code).toBe('INVALID_RELATIONSHIP');
  });
});
