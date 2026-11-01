import { AvailabilityService } from './availability.service.js';

const query = {
  dealershipId: '00000003-0000-4000-8000-000000000001',
  vehicleId: '00000002-0000-4000-8000-000000000001',
  serviceIds: [
    '00000004-0000-4000-8000-000000000001',
    '00000004-0000-4000-8000-000000000002',
  ],
  date: '2026-11-05',
};

function createPrismaMock() {
  return {
    dealership: {
      findUnique: vi.fn().mockResolvedValue({ id: query.dealershipId }),
    },
    vehicle: { findUnique: vi.fn().mockResolvedValue({ id: query.vehicleId }) },
    serviceType: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: query.serviceIds[0],
          name: 'Oil Change',
          durationMinutes: 30,
        },
        {
          id: query.serviceIds[1],
          name: 'Tire Service',
          durationMinutes: 60,
        },
      ]),
    },
    technician: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: '00000006-0000-4000-8000-000000000001',
          name: 'An Nguyen',
          dealershipId: query.dealershipId,
        },
        {
          id: '00000006-0000-4000-8000-000000000002',
          name: 'Binh Tran',
          dealershipId: query.dealershipId,
        },
      ]),
    },
    serviceBay: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: '00000008-0000-4000-8000-000000000001',
          label: 'Bay A',
          dealershipId: query.dealershipId,
        },
      ]),
    },
    appointment: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

describe('AvailabilityService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sums service durations and returns 30-minute starts in stable resource order', async () => {
    const prisma = createPrismaMock();
    const service = new AvailabilityService(prisma as never);

    const result = await service.getAvailability(query);

    expect(result.totalDurationMinutes).toBe(90);
    expect(result.emptyReason).toBeNull();
    expect(result.slots).toHaveLength(16);
    expect(result.slots[0]).toMatchObject({
      scheduledStart: '2026-11-05T01:00:00.000Z',
      scheduledEnd: '2026-11-05T02:30:00.000Z',
      suggestedTechnicianId: '00000006-0000-4000-8000-000000000001',
      suggestedServiceBayId: '00000008-0000-4000-8000-000000000001',
    });
    expect(result.slots.at(-1)?.scheduledEnd).toBe('2026-11-05T10:00:00.000Z');
  });

  it('checks vehicle conflicts across dealerships and allows an adjacent start', async () => {
    const prisma = createPrismaMock();
    prisma.appointment.findMany.mockResolvedValue([
      {
        vehicleId: query.vehicleId,
        technicianId: 'different-technician',
        serviceBayId: 'different-bay',
        scheduledStart: new Date('2026-11-05T01:00:00.000Z'),
        occupancyEnd: new Date('2026-11-05T02:30:00.000Z'),
      },
    ]);
    const service = new AvailabilityService(prisma as never);

    const result = await service.getAvailability(query);

    expect(result.slots[0]?.scheduledStart).toBe('2026-11-05T02:30:00.000Z');
  });

  it('returns an empty slot list when no technician supports every service', async () => {
    const prisma = createPrismaMock();
    prisma.technician.findMany.mockResolvedValue([]);
    const service = new AvailabilityService(prisma as never);

    const result = await service.getAvailability(query);

    expect(result.slots).toEqual([]);
    expect(result.emptyReason).toBe('NO_QUALIFIED_TECHNICIAN');
  });

  it('rejects invalid calendar dates and missing reference data', async () => {
    const prisma = createPrismaMock();
    const service = new AvailabilityService(prisma as never);

    await expect(
      service.getAvailability({ ...query, date: '2026-02-30' }),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'VALIDATION_ERROR' },
    });

    prisma.vehicle.findUnique.mockResolvedValue(null);
    await expect(service.getAvailability(query)).rejects.toMatchObject({
      status: 404,
      response: { code: 'RESOURCE_NOT_FOUND' },
    });
  });
});
