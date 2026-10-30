import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/common/configure-app.js';

const seededAppointmentId = '00000009-0000-4000-8000-000000000001';
const hcmDealershipId = '00000003-0000-4000-8000-000000000001';

describe('appointment read APIs (PostgreSQL integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns appointment details without internal allocation fields', async () => {
    const response = await request(app.getHttpServer())
      .get(`/appointments/${seededAppointmentId}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: seededAppointmentId,
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
      .get(`/appointments/${seededAppointmentId}`)
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
      expect.objectContaining({ id: seededAppointmentId }),
    ]);

    const registration = await request(app.getHttpServer())
      .get('/appointments')
      .query({ search: '51a-123' })
      .expect(200);
    expect(registration.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: seededAppointmentId }),
      ]),
    );

    const phone = await request(app.getHttpServer())
      .get('/appointments')
      .query({ search: '+8491234' })
      .expect(200);
    expect(phone.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: seededAppointmentId }),
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
