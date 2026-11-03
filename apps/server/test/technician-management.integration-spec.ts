import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/common/configure-app.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('technician management API (PostgreSQL integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let createdTechnicianId: string | undefined;
  const technicianId = '90000005-0000-4000-8000-000000000001';
  const dealershipId = '00000003-0000-4000-8000-000000000001';
  const targetDealershipId = '00000003-0000-4000-8000-000000000002';
  const oilServiceId = '00000004-0000-4000-8000-000000000001';
  const tireServiceId = '00000004-0000-4000-8000-000000000002';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.technician.deleteMany({
      where: {
        OR: [{ id: technicianId }, { name: 'API Created Technician' }],
      },
    });
    await prisma.technician.create({
      data: { id: technicianId, dealershipId, name: 'Integration Technician' },
    });
  });

  afterAll(async () => {
    if (createdTechnicianId) {
      await prisma.technician.deleteMany({
        where: { id: createdTechnicianId },
      });
    }
    await prisma.technician.deleteMany({ where: { id: technicianId } });
    await prisma.technician.deleteMany({
      where: { name: 'API Created Technician' },
    });
    await app.close();
  });

  it('creates a technician with initial service qualifications', async () => {
    const created = await request(app.getHttpServer())
      .post('/technicians')
      .send({
        name: 'API Created Technician',
        dealershipId,
        serviceTypeIds: [oilServiceId, tireServiceId],
      })
      .expect(201);
    createdTechnicianId = created.body.id;
    expect(created.body).toMatchObject({
      name: 'API Created Technician',
      dealership: { id: dealershipId },
    });
    expect(created.body.serviceTypes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: oilServiceId }),
        expect.objectContaining({ id: tireServiceId }),
      ]),
    );

    await request(app.getHttpServer())
      .post('/technicians')
      .send({
        name: 'API Created Technician',
        dealershipId,
        serviceTypeIds: [],
      })
      .expect(409);
    await request(app.getHttpServer())
      .post('/technicians')
      .send({
        name: 'Missing Qualification',
        dealershipId,
        serviceTypeIds: ['90000004-0000-4000-8000-000000000099'],
      })
      .expect(404);
  });

  it('lists technicians with dealership and service qualifications', async () => {
    const response = await request(app.getHttpServer())
      .get('/technicians')
      .query({ dealershipId })
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        {
          id: technicianId,
          name: 'Integration Technician',
          dealership: expect.objectContaining({ id: dealershipId }),
          serviceTypes: [],
        },
      ]),
    );
  });

  it('updates a technician name and dealership', async () => {
    const updated = await request(app.getHttpServer())
      .patch(`/technicians/${technicianId}`)
      .send({
        name: 'Updated Integration Technician',
        dealershipId: targetDealershipId,
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      id: technicianId,
      name: 'Updated Integration Technician',
      dealership: { id: targetDealershipId },
    });

    const oldDealership = await request(app.getHttpServer())
      .get('/technicians')
      .query({ dealershipId })
      .expect(200);
    expect(oldDealership.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: technicianId })]),
    );

    const targetDealership = await request(app.getHttpServer())
      .get('/technicians')
      .query({ dealershipId: targetDealershipId })
      .expect(200);
    expect(targetDealership.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: technicianId,
          dealership: expect.objectContaining({ id: targetDealershipId }),
        }),
      ]),
    );
  });

  it('rejects dealership-local duplicates and missing resources', async () => {
    const duplicate = await request(app.getHttpServer())
      .patch(`/technicians/${technicianId}`)
      .send({ name: 'Dung Pham', dealershipId: targetDealershipId })
      .expect(409);
    expect(duplicate.body.code).toBe('RESOURCE_CONFLICT');

    await request(app.getHttpServer())
      .patch(`/technicians/${technicianId}`)
      .send({
        name: 'Updated Integration Technician',
        dealershipId: '90000003-0000-4000-8000-000000000099',
      })
      .expect(404);

    await request(app.getHttpServer())
      .patch('/technicians/90000005-0000-4000-8000-000000000099')
      .send({ name: 'Missing', dealershipId: targetDealershipId })
      .expect(404);
  });

  it('attaches and detaches service qualifications idempotently', async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const attached = await request(app.getHttpServer())
        .put(`/technicians/${technicianId}/service-types/${oilServiceId}`)
        .expect(200);
      expect(attached.body.serviceTypes).toEqual([
        expect.objectContaining({ id: oilServiceId, name: 'Oil Change' }),
      ]);
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const detached = await request(app.getHttpServer())
        .delete(`/technicians/${technicianId}/service-types/${oilServiceId}`)
        .expect(200);
      expect(detached.body.serviceTypes).toEqual([]);
    }
  });

  it('validates technician and service identifiers', async () => {
    await request(app.getHttpServer())
      .put(`/technicians/not-a-uuid/service-types/${oilServiceId}`)
      .expect(400);
    await request(app.getHttpServer())
      .put(
        `/technicians/${technicianId}/service-types/90000004-0000-4000-8000-000000000099`,
      )
      .expect(404);
  });
});
