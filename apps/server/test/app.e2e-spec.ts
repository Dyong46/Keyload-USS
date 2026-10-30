import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from '../src/common/configure-app.js';
import { DatabaseService } from '../src/database/database.service.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('Application HTTP (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({ ping: vi.fn().mockResolvedValue(undefined) })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('/health (GET) reports database readiness and demo identity', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(response.body).toMatchObject({
      status: 'ok',
      database: 'up',
      demoStaff: {
        id: '00000000-0000-4000-8000-000000000001',
        displayName: 'Demo Dealership Staff',
      },
    });
  });

  it('does not expose a starter root endpoint and preserves a valid request ID', async () => {
    const requestId = '11111111-1111-4111-8111-111111111111';
    const response = await request(app.getHttpServer())
      .get('/')
      .set('X-Request-Id', requestId)
      .expect(404);

    expect(response.headers['x-request-id']).toBe(requestId);
    expect(response.body).toEqual({
      statusCode: 404,
      code: 'HTTP_ERROR',
      message: 'Cannot GET /',
      requestId,
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
