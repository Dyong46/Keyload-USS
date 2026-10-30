import { HealthService } from './health.service.js';

describe('HealthService', () => {
  it('returns ready only after the database ping succeeds', async () => {
    const database = { ping: vi.fn().mockResolvedValue(undefined) };
    const service = new HealthService(database as never);

    await expect(service.check()).resolves.toMatchObject({
      status: 'ok',
      database: 'up',
    });
    expect(database.ping).toHaveBeenCalledOnce();
  });

  it('maps database failures to a 503 response', async () => {
    const database = { ping: vi.fn().mockRejectedValue(new Error('offline')) };
    const service = new HealthService(database as never);

    await expect(service.check()).rejects.toMatchObject({ status: 503 });
  });
});
