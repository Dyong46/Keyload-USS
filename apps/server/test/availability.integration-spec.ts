import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/common/configure-app.js';

const ids = {
  dealership: '00000003-0000-4000-8000-000000000001',
  vehicle: '00000002-0000-4000-8000-000000000002',
  oil: '00000004-0000-4000-8000-000000000001',
  tires: '00000004-0000-4000-8000-000000000002',
  full: '00000004-0000-4000-8000-000000000004',
  alignment: '00000004-0000-4000-8000-000000000007',
  coolant: '00000004-0000-4000-8000-000000000010',
  detailing: '00000004-0000-4000-8000-000000000013',
  technician: '00000006-0000-4000-8000-000000000001',
  bayA: '00000008-0000-4000-8000-000000000001',
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

describe('availability API (PostgreSQL integration)', () => {
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

  it('returns qualified resources, fixed duration, and no-store response', async () => {
    const response = await request(app.getHttpServer())
      .get('/availability')
      .query({
        dealershipId: ids.dealership,
        vehicleId: ids.vehicle,
        serviceIds: [ids.oil, ids.tires],
        date: futureVietnamDate(7),
      })
      .expect(200)
      .expect('Cache-Control', 'no-store');

    expect(response.body.totalDurationMinutes).toBe(90);
    expect(response.body.timeZone).toBe('Asia/Ho_Chi_Minh');
    expect(response.body.slots.length).toBeGreaterThan(0);
    expect(response.body.slots[0].technicians).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ids.technician })]),
    );
    expect(response.body.slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          suggestedTechnicianId: ids.technician,
          suggestedServiceBayId: ids.bayA,
        }),
      ]),
    );
  });

  it('returns no slots when the dealership has no common qualified technician', async () => {
    const response = await request(app.getHttpServer())
      .get('/availability')
      .query({
        dealershipId: ids.dealership,
        vehicleId: ids.vehicle,
        serviceIds: [ids.full, ids.alignment, ids.coolant, ids.detailing],
        date: futureVietnamDate(7),
      })
      .expect(200);

    expect(response.body.totalDurationMinutes).toBe(330);
    expect(response.body.slots).toEqual([]);
  });

  it('rejects duplicate services and missing reference data', async () => {
    const duplicate = await request(app.getHttpServer())
      .get('/availability')
      .query({
        dealershipId: ids.dealership,
        vehicleId: ids.vehicle,
        serviceIds: [ids.oil, ids.oil],
        date: futureVietnamDate(7),
      })
      .expect(400);
    expect(duplicate.body.code).toBe('VALIDATION_ERROR');

    const missing = await request(app.getHttpServer())
      .get('/availability')
      .query({
        dealershipId: '00000003-0000-4000-8000-000000000099',
        vehicleId: ids.vehicle,
        serviceIds: [ids.oil],
        date: futureVietnamDate(7),
      })
      .expect(404);
    expect(missing.body.code).toBe('RESOURCE_NOT_FOUND');
  });
});
