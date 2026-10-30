import {
  normalizePhone,
  normalizeRegistrationNumber,
  ReferenceDataService,
} from './reference-data.service.js';

describe('ReferenceDataService', () => {
  it('returns an empty vehicle list for an existing customer', async () => {
    const prisma = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({ id: 'customer-id' }),
      },
      vehicle: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new ReferenceDataService(prisma as never);

    await expect(service.listCustomerVehicles('customer-id')).resolves.toEqual(
      [],
    );
  });

  it('returns RESOURCE_NOT_FOUND when the customer does not exist', async () => {
    const prisma = {
      customer: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const service = new ReferenceDataService(prisma as never);

    await expect(
      service.listCustomerVehicles('missing-customer'),
    ).rejects.toMatchObject({
      status: 404,
      response: { code: 'RESOURCE_NOT_FOUND' },
    });
  });

  it('normalizes Vietnamese and international phone input', () => {
    expect(normalizePhone('0912 345 678')).toBe('+84912345678');
    expect(normalizePhone('84 912 345 678')).toBe('+84912345678');
    expect(normalizePhone('+1 (415) 555-0123')).toBe('+14155550123');
  });

  it('normalizes registration input for lookup and uniqueness', () => {
    expect(normalizeRegistrationNumber(' 51a-123.45 ')).toBe('51A12345');
  });
});
