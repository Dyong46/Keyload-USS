import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/common/configure-app.js';
import { PrismaService } from '../src/database/prisma.service.js';

const testAppointmentId = '00000009-0000-4000-8000-000000000001';
const testRequestKey = '30000010-0000-4000-8000-000000000001';
const hcmDealershipId = '00000003-0000-4000-8000-000000000001';

describe('appointment read APIs (PostgreSQL integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.appointment.deleteMany({
      where: {
        OR: [{ id: testAppointmentId }, { requestKey: testRequestKey }],
      },
    });
    const scheduledStart = new Date(Date.now() + 14 * 24 * 60 * 60_000);
    scheduledStart.setUTCSeconds(0, 0);
    const scheduledEnd = new Date(scheduledStart.getTime() + 90 * 60_000);
    await prisma.appointment.create({
      data: {
        id: testAppointmentId,
        requestKey: testRequestKey,
        requestHash: 'a'.repeat(64),
        customerId: '00000001-0000-4000-8000-000000000001',
        vehicleId: '00000002-0000-4000-8000-000000000001',
        dealershipId: hcmDealershipId,
        technicianId: '00000006-0000-4000-8000-000000000007',
        serviceBayId: '00000008-0000-4000-8000-000000000005',
        scheduledStart,
        scheduledEnd,
        occupancyEnd: scheduledEnd,
        totalDurationMinutes: 90,
        services: {
          create: [
            {
              serviceTypeId: '00000004-0000-4000-8000-000000000001',
              name: 'Oil Change',
              durationMinutes: 30,
            },
            {
              serviceTypeId: '00000004-0000-4000-8000-000000000002',
              name: 'Tire Service',
              durationMinutes: 60,
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: { requestKey: testRequestKey },
    });
    await app.close();
  });

  it('returns appointment details without internal allocation fields', async () => {
    const response = await request(app.getHttpServer())
      .get(`/appointments/${testAppointmentId}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: testAppointmentId,
      customer: { name: 'Alice Nguyen' },
      vehicle: { registrationNumber: '51A-123.45' },
      dealership: { id: hcmDealershipId },
      totalDurationMinutes: 90,
      status: 'CONFIRMED',
    });
    expect(response.body.services).toHaveLength(2);
    expect(response.body).not.toHaveProperty('requestKey');
    expect(response.body).not.toHaveProperty('requestHash');
    expect(response.body).not.toHaveProperty('occupancyEnd');
  });

  it('returns not found and validation errors for invalid detail IDs', async () => {
    const missing = await request(app.getHttpServer())
      .get('/appointments/00000009-0000-4000-8000-000000000099')
      .expect(404);
    expect(missing.body.code).toBe('RESOURCE_NOT_FOUND');

    const invalid = await request(app.getHttpServer())
      .get('/appointments/not-a-uuid')
      .expect(400);
    expect(invalid.body.code).toBe('VALIDATION_ERROR');
  });

  it('uses default pagination and stable scheduled-start ordering', async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments')
      .expect(200);

    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(20);
    expect(response.body.total).toBeGreaterThanOrEqual(1);
    expect(response.body.items.length).toBeLessThanOrEqual(20);

    const order = response.body.items.map(
      ({ scheduledStart, id }: { scheduledStart: string; id: string }) =>
        `${scheduledStart}:${id}`,
    );
    expect(order).toEqual([...order].sort());
  });

  it('combines dealership, date, status, and case-insensitive search filters', async () => {
    const detail = await request(app.getHttpServer())
      .get(`/appointments/${testAppointmentId}`)
      .expect(200);
    const businessDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(detail.body.scheduledStart));

    const response = await request(app.getHttpServer())
      .get('/appointments')
      .query({
        dealershipId: hcmDealershipId,
        date: businessDate,
        status: 'CONFIRMED',
        search: '  aLiCe  ',
      })
      .expect(200);

    expect(response.body.items).toEqual([
      expect.objectContaining({ id: testAppointmentId }),
    ]);

    const registration = await request(app.getHttpServer())
      .get('/appointments')
      .query({ search: '51a-123' })
      .expect(200);
    expect(registration.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: testAppointmentId }),
      ]),
    );

    const phone = await request(app.getHttpServer())
      .get('/appointments')
      .query({ search: '+8491234' })
      .expect(200);
    expect(phone.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: testAppointmentId }),
      ]),
    );
  });

  it('treats SQL wildcard characters literally and validates pagination', async () => {
    const literalWildcard = await request(app.getHttpServer())
      .get('/appointments')
      .query({ search: '%' })
      .expect(200);
    expect(literalWildcard.body.total).toBe(0);

    await request(app.getHttpServer())
      .get('/appointments')
      .query({ page: 0 })
      .expect(400);
    await request(app.getHttpServer())
      .get('/appointments')
      .query({ pageSize: 101 })
      .expect(400);

    const beyond = await request(app.getHttpServer())
      .get('/appointments')
      .query({ page: 999, pageSize: 20 })
      .expect(200);
    expect(beyond.body.items).toEqual([]);
    expect(beyond.body.total).toBeGreaterThanOrEqual(1);
  });
});
