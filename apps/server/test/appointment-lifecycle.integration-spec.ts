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
    corolla: '00000002-0000-4000-8000-000000000001',
    ranger: '00000002-0000-4000-8000-000000000002',
    city: '00000002-0000-4000-8000-000000000003',
  },
  dealerships: {
    hcm: '00000003-0000-4000-8000-000000000001',
    hanoi: '00000003-0000-4000-8000-000000000002',
  },
  service: '00000004-0000-4000-8000-000000000001',
  technicians: {
    an: '00000006-0000-4000-8000-000000000001',
    binh: '00000006-0000-4000-8000-000000000002',
    dung: '00000006-0000-4000-8000-000000000004',
    giang: '00000006-0000-4000-8000-000000000005',
  },
  bays: {
    hcmA: '00000008-0000-4000-8000-000000000001',
    hcmB: '00000008-0000-4000-8000-000000000002',
    hanoiA: '00000008-0000-4000-8000-000000000003',
    hanoiB: '00000008-0000-4000-8000-000000000004',
  },
  appointments: {
    cancel: '20000009-0000-4000-8000-000000000001',
    complete: '20000009-0000-4000-8000-000000000002',
    tooEarly: '20000009-0000-4000-8000-000000000003',
    race: '20000009-0000-4000-8000-000000000004',
  },
  keys: {
    cancel: '20000010-0000-4000-8000-000000000001',
    complete: '20000010-0000-4000-8000-000000000002',
    tooEarly: '20000010-0000-4000-8000-000000000003',
    race: '20000010-0000-4000-8000-000000000004',
  },
} as const;

type Fixture = {
  id: string;
  requestKey: string;
  customerId: string;
  vehicleId: string;
  dealershipId: string;
  technicianId: string;
  serviceBayId: string;
  scheduledStart: Date;
};

describe('appointment lifecycle APIs (PostgreSQL integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  async function createFixture(fixture: Fixture): Promise<void> {
    const scheduledEnd = new Date(
      fixture.scheduledStart.getTime() + 30 * 60_000,
    );
    await prisma.appointment.create({
      data: {
        ...fixture,
        scheduledEnd,
        occupancyEnd: scheduledEnd,
        totalDurationMinutes: 30,
        requestHash: 'a'.repeat(64),
        services: {
          create: {
            serviceTypeId: ids.service,
            name: 'Oil Change',
            durationMinutes: 30,
          },
        },
      },
    });
  }

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
    const now = Date.now();
    await createFixture({
      id: ids.appointments.cancel,
      requestKey: ids.keys.cancel,
      customerId: ids.customers.minh,
      vehicleId: ids.vehicles.city,
      dealershipId: ids.dealerships.hanoi,
      technicianId: ids.technicians.giang,
      serviceBayId: ids.bays.hanoiB,
      scheduledStart: new Date(now + 24 * 60 * 60_000),
    });
    await createFixture({
      id: ids.appointments.complete,
      requestKey: ids.keys.complete,
      customerId: ids.customers.alice,
      vehicleId: ids.vehicles.ranger,
      dealershipId: ids.dealerships.hanoi,
      technicianId: ids.technicians.dung,
      serviceBayId: ids.bays.hanoiA,
      scheduledStart: new Date(now - 10 * 60_000),
    });
    await createFixture({
      id: ids.appointments.tooEarly,
      requestKey: ids.keys.tooEarly,
      customerId: ids.customers.alice,
      vehicleId: ids.vehicles.corolla,
      dealershipId: ids.dealerships.hcm,
      technicianId: ids.technicians.an,
      serviceBayId: ids.bays.hcmA,
      scheduledStart: new Date(now + 24 * 60 * 60_000),
    });
    await createFixture({
      id: ids.appointments.race,
      requestKey: ids.keys.race,
      customerId: ids.customers.minh,
      vehicleId: ids.vehicles.city,
      dealershipId: ids.dealerships.hcm,
      technicianId: ids.technicians.binh,
      serviceBayId: ids.bays.hcmB,
      scheduledStart: new Date(now - 10 * 60_000),
    });
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: { requestKey: { in: Object.values(ids.keys) } },
    });
    await app.close();
  });

  it('cancels once and returns the unchanged record on repeat', async () => {
    const first = await request(app.getHttpServer())
      .post(`/appointments/${ids.appointments.cancel}/cancel`)
      .expect(200);
    const repeated = await request(app.getHttpServer())
      .post(`/appointments/${ids.appointments.cancel}/cancel`)
      .expect(200);

    expect(first.body).toMatchObject({
      status: 'CANCELLED',
      cancelledAt: expect.any(String),
      actualCompletedAt: null,
    });
    expect(repeated.body.cancelledAt).toBe(first.body.cancelledAt);
    const stored = await prisma.appointment.findUniqueOrThrow({
      where: { id: ids.appointments.cancel },
    });
    expect(stored.occupancyEnd).toEqual(stored.scheduledStart);
  });

  it('completes after start, releases early, and rejects repeat completion', async () => {
    const completed = await request(app.getHttpServer())
      .post(`/appointments/${ids.appointments.complete}/complete`)
      .expect(200);

    expect(completed.body).toMatchObject({
      status: 'COMPLETED',
      cancelledAt: null,
      actualCompletedAt: expect.any(String),
    });
    const stored = await prisma.appointment.findUniqueOrThrow({
      where: { id: ids.appointments.complete },
    });
    expect(stored.occupancyEnd).toEqual(stored.actualCompletedAt);
    expect(stored.occupancyEnd.getTime()).toBeLessThan(
      stored.scheduledEnd.getTime(),
    );

    const repeated = await request(app.getHttpServer())
      .post(`/appointments/${ids.appointments.complete}/complete`)
      .expect(409);
    expect(repeated.body.code).toBe('APPOINTMENT_ALREADY_COMPLETED');

    const cancelCompleted = await request(app.getHttpServer())
      .post(`/appointments/${ids.appointments.complete}/cancel`)
      .expect(409);
    expect(cancelCompleted.body.code).toBe('INVALID_APPOINTMENT_STATE');
  });

  it('rejects completion for cancelled and not-yet-started appointments', async () => {
    const cancelled = await request(app.getHttpServer())
      .post(`/appointments/${ids.appointments.cancel}/complete`)
      .expect(409);
    expect(cancelled.body.code).toBe('INVALID_APPOINTMENT_STATE');

    const tooEarly = await request(app.getHttpServer())
      .post(`/appointments/${ids.appointments.tooEarly}/complete`)
      .expect(409);
    expect(tooEarly.body.code).toBe('INVALID_APPOINTMENT_STATE');
  });

  it('serializes concurrent cancel and complete attempts', async () => {
    const responses = await Promise.all([
      request(app.getHttpServer()).post(
        `/appointments/${ids.appointments.race}/cancel`,
      ),
      request(app.getHttpServer()).post(
        `/appointments/${ids.appointments.race}/complete`,
      ),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    const stored = await prisma.appointment.findUniqueOrThrow({
      where: { id: ids.appointments.race },
    });
    expect(['CANCELLED', 'COMPLETED']).toContain(stored.status);
    expect(Boolean(stored.cancelledAt)).not.toBe(
      Boolean(stored.actualCompletedAt),
    );
  });

  it('validates IDs, missing records, and mutation bodies', async () => {
    await request(app.getHttpServer())
      .post('/appointments/not-a-uuid/cancel')
      .expect(400);

    const missing = await request(app.getHttpServer())
      .post('/appointments/20000009-0000-4000-8000-000000000099/complete')
      .expect(404);
    expect(missing.body.code).toBe('RESOURCE_NOT_FOUND');

    const withBody = await request(app.getHttpServer())
      .post(`/appointments/${ids.appointments.tooEarly}/cancel`)
      .send({ reason: 'customer request' })
      .expect(400);
    expect(withBody.body.code).toBe('VALIDATION_ERROR');
  });
});
