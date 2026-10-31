import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/common/configure-app.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('reference data API (PostgreSQL integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let createdCustomerId: string | undefined;
  const testPhone = '+84900009999';
  const updatedTestPhone = '+84900009998';
  const testRegistration = '59Z-999.99';
  const testServiceNames = [
    'Integration Service',
    'Updated Integration Service',
  ];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.vehicle.deleteMany({
      where: { registrationNumberNormalized: '59Z99999' },
    });
    await prisma.customer.deleteMany({
      where: { phone: { in: [testPhone, updatedTestPhone] } },
    });
    await prisma.serviceType.deleteMany({
      where: { name: { in: testServiceNames } },
    });
  });

  afterAll(async () => {
    await prisma.vehicle.deleteMany({
      where: { registrationNumberNormalized: '59Z99999' },
    });
    if (createdCustomerId) {
      await prisma.customer.deleteMany({ where: { id: createdCustomerId } });
    }
    await prisma.customer.deleteMany({
      where: { phone: { in: [testPhone, updatedTestPhone] } },
    });
    await prisma.serviceType.deleteMany({
      where: { name: { in: testServiceNames } },
    });
    await app.close();
  });

  it('returns the complete seeded reference dataset', async () => {
    const [customers, dealerships, serviceTypes, technicians] =
      await Promise.all([
        request(app.getHttpServer())
          .get('/customers')
          .query({ limit: 20 })
          .expect(200),
        request(app.getHttpServer()).get('/dealerships').expect(200),
        request(app.getHttpServer()).get('/service-types').expect(200),
        request(app.getHttpServer()).get('/technicians').expect(200),
      ]);

    expect(customers.body).toHaveLength(20);
    expect(dealerships.body).toHaveLength(4);
    expect(serviceTypes.body).toHaveLength(15);
    expect(technicians.body).toHaveLength(20);
    const bayCounts = await prisma.serviceBay.groupBy({
      by: ['dealershipId'],
      _count: { _all: true },
    });
    expect(bayCounts).toHaveLength(4);
    expect(bayCounts.every((item) => item._count._all === 4)).toBe(true);
    expect(serviceTypes.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Oil Change', durationMinutes: 30 }),
        expect.objectContaining({ name: 'Full Service', durationMinutes: 120 }),
      ]),
    );
  });

  it('returns only vehicles owned by the selected customer', async () => {
    const response = await request(app.getHttpServer())
      .get('/customers/00000001-0000-4000-8000-000000000001/vehicles')
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          customerId: '00000001-0000-4000-8000-000000000001',
          registrationNumber: '51A-123.45',
        }),
      ]),
    );
  });

  it('searches customers by normalized phone or registration', async () => {
    const byPhone = await request(app.getHttpServer())
      .get('/customers')
      .query({ search: '0912 345', limit: 10 })
      .expect(200);
    expect(byPhone.body).toEqual([
      expect.objectContaining({ name: 'Alice Nguyen', phone: '+84912345678' }),
    ]);

    const byRegistration = await request(app.getHttpServer())
      .get('/customers')
      .query({ search: '51c 45678' })
      .expect(200);
    expect(byRegistration.body).toEqual([
      expect.objectContaining({ name: 'Alice Nguyen' }),
    ]);

    await request(app.getHttpServer())
      .get('/customers')
      .query({ limit: 21 })
      .expect(400);
  });

  it('creates a customer and an owned vehicle with uniqueness checks', async () => {
    const customer = await request(app.getHttpServer())
      .post('/customers')
      .send({ name: 'Operations Test', phone: '0900 009 999' })
      .expect(201);
    createdCustomerId = customer.body.id;
    expect(customer.body).toMatchObject({
      name: 'Operations Test',
      phone: testPhone,
    });

    const vehicle = await request(app.getHttpServer())
      .post(`/customers/${createdCustomerId}/vehicles`)
      .send({
        registrationNumber: testRegistration.toLowerCase(),
        make: 'Test Make',
        model: 'Test Model',
      })
      .expect(201);
    expect(vehicle.body).toMatchObject({
      customerId: createdCustomerId,
      registrationNumber: testRegistration,
    });

    const duplicateCustomer = await request(app.getHttpServer())
      .post('/customers')
      .send({ name: 'Duplicate', phone: testPhone })
      .expect(409);
    expect(duplicateCustomer.body.code).toBe('RESOURCE_CONFLICT');

    const duplicateVehicle = await request(app.getHttpServer())
      .post(`/customers/${createdCustomerId}/vehicles`)
      .send({
        registrationNumber: '59z 99999',
        make: 'Other',
        model: 'Other',
      })
      .expect(409);
    expect(duplicateVehicle.body.code).toBe('RESOURCE_CONFLICT');
  });

  it('updates a customer and validates update conflicts', async () => {
    const updated = await request(app.getHttpServer())
      .patch(`/customers/${createdCustomerId}`)
      .send({ name: 'Updated Operations Test', phone: '0900 009 998' })
      .expect(200);
    expect(updated.body).toMatchObject({
      id: createdCustomerId,
      name: 'Updated Operations Test',
      phone: updatedTestPhone,
    });

    await request(app.getHttpServer())
      .patch(`/customers/${createdCustomerId}`)
      .send({})
      .expect(400);

    const duplicate = await request(app.getHttpServer())
      .patch(`/customers/${createdCustomerId}`)
      .send({ phone: '+84912345678' })
      .expect(409);
    expect(duplicate.body.code).toBe('RESOURCE_CONFLICT');

    await request(app.getHttpServer())
      .patch('/customers/00000001-0000-4000-8000-000000000099')
      .send({ name: 'Missing' })
      .expect(404);
  });

  it('creates and updates service types for future bookings', async () => {
    const created = await request(app.getHttpServer())
      .post('/service-types')
      .send({ name: testServiceNames[0], durationMinutes: 45 })
      .expect(201);
    expect(created.body).toMatchObject({
      name: testServiceNames[0],
      durationMinutes: 45,
    });

    const updated = await request(app.getHttpServer())
      .patch(`/service-types/${created.body.id}`)
      .send({ name: testServiceNames[1], durationMinutes: 75 })
      .expect(200);
    expect(updated.body).toMatchObject({
      id: created.body.id,
      name: testServiceNames[1],
      durationMinutes: 75,
    });

    await request(app.getHttpServer())
      .post('/service-types')
      .send({ name: 'Oil Change', durationMinutes: 30 })
      .expect(409);
    await request(app.getHttpServer())
      .post('/service-types')
      .send({ name: 'Invalid Duration', durationMinutes: 0 })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/service-types/${created.body.id}`)
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .patch('/service-types/00000004-0000-4000-8000-000000000099')
      .send({ durationMinutes: 60 })
      .expect(404);
  });

  it('distinguishes no vehicles, missing customer, and invalid UUID', async () => {
    await request(app.getHttpServer())
      .get('/customers/00000001-0000-4000-8000-000000000003/vehicles')
      .expect(200, []);

    const missing = await request(app.getHttpServer())
      .get('/customers/00000001-0000-4000-8000-000000000099/vehicles')
      .expect(404);
    expect(missing.body.code).toBe('RESOURCE_NOT_FOUND');

    const invalid = await request(app.getHttpServer())
      .get('/customers/not-a-uuid/vehicles')
      .expect(400);
    expect(invalid.body.code).toBe('VALIDATION_ERROR');
  });

  it('seeds both common-technician and no-common-technician combinations', async () => {
    const hcmDealershipId = '00000003-0000-4000-8000-000000000001';
    const [oilAndTires, tiresAndFull] = await Promise.all([
      prisma.technician.count({
        where: {
          dealershipId: hcmDealershipId,
          AND: [
            {
              serviceTypes: {
                some: {
                  serviceTypeId: '00000004-0000-4000-8000-000000000001',
                },
              },
            },
            {
              serviceTypes: {
                some: {
                  serviceTypeId: '00000004-0000-4000-8000-000000000002',
                },
              },
            },
          ],
        },
      }),
      prisma.technician.count({
        where: {
          dealershipId: hcmDealershipId,
          AND: [
            {
              serviceTypes: {
                some: {
                  serviceTypeId: '00000004-0000-4000-8000-000000000002',
                },
              },
            },
            {
              serviceTypes: {
                some: {
                  serviceTypeId: '00000004-0000-4000-8000-000000000004',
                },
              },
            },
          ],
        },
      }),
    ]);

    expect(oilAndTires).toBeGreaterThan(0);
    expect(tiresAndFull).toBe(0);
  });
});
