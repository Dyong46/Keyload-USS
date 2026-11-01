import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../common/api-exception.js';
import { PrismaService } from '../database/prisma.service.js';
import type {
  AvailabilityEmptyReason,
  AvailabilityQueryDto,
  AvailabilityResponseDto,
  AvailabilitySlotDto,
} from './availability.dto.js';

const SLOT_MINUTES = 30;
const OPEN_UTC_HOUR = 1; // 08:00 Asia/Ho_Chi_Minh (UTC+7)
const CLOSE_UTC_HOUR = 10; // 17:00 Asia/Ho_Chi_Minh (UTC+7)

type Occupancy = {
  vehicleId: string;
  technicianId: string;
  serviceBayId: string;
  scheduledStart: Date;
  occupancyEnd: Date;
};

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function overlaps(occupancy: Occupancy, start: Date, end: Date): boolean {
  return occupancy.scheduledStart < end && occupancy.occupancyEnd > start;
}

function businessDayBounds(date: string): { open: Date; close: Date } {
  const open = new Date(`${date}T0${OPEN_UTC_HOUR}:00:00.000Z`);
  const close = new Date(`${date}T${CLOSE_UTC_HOUR}:00:00.000Z`);

  if (
    Number.isNaN(open.getTime()) ||
    open.toISOString().slice(0, 10) !== date
  ) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'date must be a valid calendar date',
    );
  }

  return { open, close };
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailability(
    query: AvailabilityQueryDto,
  ): Promise<AvailabilityResponseDto> {
    const generatedAt = new Date();
    const { open, close } = businessDayBounds(query.date);
    const serviceIds = [...query.serviceIds].sort();

    const [dealership, vehicle, services] = await Promise.all([
      this.prisma.dealership.findUnique({
        where: { id: query.dealershipId },
        select: { id: true },
      }),
      this.prisma.vehicle.findUnique({
        where: { id: query.vehicleId },
        select: { id: true },
      }),
      this.prisma.serviceType.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, name: true, durationMinutes: true },
        orderBy: { id: 'asc' },
      }),
    ]);

    if (!dealership || !vehicle || services.length !== serviceIds.length) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'RESOURCE_NOT_FOUND',
        'Dealership, vehicle, or service type was not found',
      );
    }

    const totalDurationMinutes = services.reduce(
      (total, service) => total + service.durationMinutes,
      0,
    );

    const [technicians, serviceBays] = await Promise.all([
      this.prisma.technician.findMany({
        where: {
          dealershipId: query.dealershipId,
          AND: serviceIds.map((serviceTypeId) => ({
            serviceTypes: { some: { serviceTypeId } },
          })),
        },
        select: { id: true, name: true, dealershipId: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.serviceBay.findMany({
        where: { dealershipId: query.dealershipId },
        select: { id: true, label: true, dealershipId: true },
        orderBy: { id: 'asc' },
      }),
    ]);

    const occupancies = await this.prisma.appointment.findMany({
      where: {
        scheduledStart: { lt: close },
        occupancyEnd: { gt: open },
        OR: [
          { vehicleId: query.vehicleId },
          { technicianId: { in: technicians.map(({ id }) => id) } },
          { serviceBayId: { in: serviceBays.map(({ id }) => id) } },
        ],
      },
      select: {
        vehicleId: true,
        technicianId: true,
        serviceBayId: true,
        scheduledStart: true,
        occupancyEnd: true,
      },
    });

    const slots: AvailabilitySlotDto[] = [];
    let consideredStarts = 0;
    let vehicleBlockedStarts = 0;
    for (
      let scheduledStart = open;
      scheduledStart < close;
      scheduledStart = addMinutes(scheduledStart, SLOT_MINUTES)
    ) {
      const scheduledEnd = addMinutes(scheduledStart, totalDurationMinutes);
      if (scheduledStart < generatedAt || scheduledEnd > close) continue;
      consideredStarts += 1;

      const overlapping = occupancies.filter((occupancy) =>
        overlaps(occupancy, scheduledStart, scheduledEnd),
      );
      if (
        overlapping.some((occupancy) => occupancy.vehicleId === query.vehicleId)
      ) {
        vehicleBlockedStarts += 1;
        continue;
      }

      const availableTechnicians = technicians.filter(
        (technician) =>
          !overlapping.some(
            (occupancy) => occupancy.technicianId === technician.id,
          ),
      );
      const availableServiceBays = serviceBays.filter(
        (serviceBay) =>
          !overlapping.some(
            (occupancy) => occupancy.serviceBayId === serviceBay.id,
          ),
      );
      if (!availableTechnicians.length || !availableServiceBays.length) {
        continue;
      }

      slots.push({
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        technicians: availableTechnicians,
        serviceBays: availableServiceBays,
        suggestedTechnicianId: availableTechnicians[0].id,
        suggestedServiceBayId: availableServiceBays[0].id,
      });
    }

    let emptyReason: AvailabilityEmptyReason | null = null;
    if (!slots.length) {
      const operatingMinutes = (close.getTime() - open.getTime()) / 60_000;
      if (totalDurationMinutes > operatingMinutes) {
        emptyReason = 'DURATION_EXCEEDS_OPERATING_HOURS';
      } else if (!technicians.length) {
        emptyReason = 'NO_QUALIFIED_TECHNICIAN';
      } else if (!serviceBays.length) {
        emptyReason = 'NO_SERVICE_BAY';
      } else if (!consideredStarts) {
        emptyReason = 'NO_REMAINING_START_TIME';
      } else if (vehicleBlockedStarts === consideredStarts) {
        emptyReason = 'VEHICLE_UNAVAILABLE';
      } else {
        emptyReason = 'NO_RESOURCE_CAPACITY';
      }
    }

    return {
      dealershipId: query.dealershipId,
      vehicleId: query.vehicleId,
      date: query.date,
      timeZone: 'Asia/Ho_Chi_Minh',
      generatedAt: generatedAt.toISOString(),
      services,
      totalDurationMinutes,
      slots,
      emptyReason,
    };
  }
}
