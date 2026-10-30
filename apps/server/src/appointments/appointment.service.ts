import { createHash } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { ApiException } from '../common/api-exception.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type {
  AppointmentDto,
  AppointmentListQueryDto,
  AppointmentListResponseDto,
  CreateAppointmentDto,
} from './appointment.dto.js';

const GRACE_PERIOD_MS = 15 * 60_000;
const VIETNAM_OFFSET_MS = 7 * 60 * 60_000;

const appointmentInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  vehicle: {
    select: {
      id: true,
      customerId: true,
      registrationNumber: true,
      make: true,
      model: true,
    },
  },
  dealership: { select: { id: true, name: true } },
  technician: { select: { id: true, name: true, dealershipId: true } },
  serviceBay: { select: { id: true, label: true, dealershipId: true } },
  services: {
    select: { serviceTypeId: true, name: true, durationMinutes: true },
    orderBy: { serviceTypeId: 'asc' as const },
  },
} as const;

type AppointmentRecord = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;

type CreateResult = { appointment: AppointmentDto; replayed: boolean };

function canonicalRequest(body: CreateAppointmentDto) {
  return {
    customerId: body.customerId.toLowerCase(),
    vehicleId: body.vehicleId.toLowerCase(),
    dealershipId: body.dealershipId.toLowerCase(),
    serviceIds: body.serviceIds.map((id) => id.toLowerCase()).sort(),
    scheduledStart: new Date(body.scheduledStart).toISOString(),
    technicianId: body.technicianId.toLowerCase(),
    serviceBayId: body.serviceBayId.toLowerCase(),
  };
}

function requestHash(body: CreateAppointmentDto): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalRequest(body)))
    .digest('hex');
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function validateAppointmentSchedule(
  start: Date,
  end: Date,
  now: Date,
): void {
  const localStart = new Date(start.getTime() + VIETNAM_OFFSET_MS);
  const localEnd = new Date(end.getTime() + VIETNAM_OFFSET_MS);
  const startsOnGrid =
    localStart.getUTCMinutes() % 30 === 0 &&
    localStart.getUTCSeconds() === 0 &&
    localStart.getUTCMilliseconds() === 0;
  const withinOpeningHours =
    localStart.getUTCHours() >= 8 &&
    localEnd.getUTCFullYear() === localStart.getUTCFullYear() &&
    localEnd.getUTCMonth() === localStart.getUTCMonth() &&
    localEnd.getUTCDate() === localStart.getUTCDate() &&
    (localEnd.getUTCHours() < 17 ||
      (localEnd.getUTCHours() === 17 && localEnd.getUTCMinutes() === 0));

  if (!startsOnGrid || !withinOpeningHours) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'INVALID_SCHEDULE',
      'Appointment must start on a 30-minute boundary and end by 17:00 Vietnam time',
    );
  }
  if (now.getTime() > start.getTime() + GRACE_PERIOD_MS) {
    throw new ApiException(
      HttpStatus.CONFLICT,
      'CONFIRMATION_TOO_LATE',
      'The selected start is more than 15 minutes in the past',
    );
  }
}

function toAppointmentDto(appointment: AppointmentRecord): AppointmentDto {
  return {
    id: appointment.id,
    customer: appointment.customer,
    vehicle: appointment.vehicle,
    dealership: appointment.dealership,
    services: appointment.services,
    totalDurationMinutes: appointment.totalDurationMinutes,
    technician: appointment.technician,
    serviceBay: appointment.serviceBay,
    scheduledStart: appointment.scheduledStart.toISOString(),
    scheduledEnd: appointment.scheduledEnd.toISOString(),
    status: appointment.status,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
    cancelledAt: appointment.cancelledAt?.toISOString() ?? null,
    actualCompletedAt: appointment.actualCompletedAt?.toISOString() ?? null,
  };
}

function isRetryableTransactionError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  );
}

function isAllocationConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('appointments_technician_no_overlap') ||
    message.includes('appointments_bay_no_overlap') ||
    message.includes('appointments_vehicle_no_overlap') ||
    message.includes('23P01')
  );
}

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listAppointments(
    query: AppointmentListQueryDto,
  ): Promise<AppointmentListResponseDto> {
    const where: Prisma.AppointmentWhereInput = {};
    if (query.dealershipId) where.dealershipId = query.dealershipId;
    if (query.status) where.status = query.status;
    if (query.date) {
      const dateAtUtc = new Date(`${query.date}T00:00:00.000Z`);
      if (
        Number.isNaN(dateAtUtc.getTime()) ||
        dateAtUtc.toISOString().slice(0, 10) !== query.date
      ) {
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          'date must be a valid calendar date',
        );
      }
      const start = new Date(`${query.date}T00:00:00+07:00`);
      where.scheduledStart = {
        gte: start,
        lt: new Date(start.getTime() + 24 * 60 * 60_000),
      };
    }

    const search = query.search?.trim();
    if (search) {
      const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
      const matches = await this.prisma.$queryRaw<{ id: string }[]>(
        Prisma.sql`
          SELECT appointment.id
          FROM appointments AS appointment
          JOIN customers AS customer ON customer.id = appointment.customer_id
          JOIN vehicles AS vehicle ON vehicle.id = appointment.vehicle_id
          WHERE customer.name ILIKE ${pattern} ESCAPE '\\'
             OR customer.phone ILIKE ${pattern} ESCAPE '\\'
             OR vehicle.registration_number ILIKE ${pattern} ESCAPE '\\'
        `,
      );
      where.id = { in: matches.map(({ id }) => id) };
    }

    const [records, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: appointmentInclude,
        orderBy: [{ scheduledStart: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      items: records.map(toAppointmentDto),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async getAppointment(id: string): Promise<AppointmentDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!appointment) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'RESOURCE_NOT_FOUND',
        'Appointment was not found',
      );
    }
    return toAppointmentDto(appointment);
  }

  async cancelAppointment(id: string): Promise<AppointmentDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT id FROM appointments WHERE id = ${id}::uuid FOR UPDATE`,
      );
      if (!locked.length) {
        throw new ApiException(
          HttpStatus.NOT_FOUND,
          'RESOURCE_NOT_FOUND',
          'Appointment was not found',
        );
      }

      const appointment = await tx.appointment.findUniqueOrThrow({
        where: { id },
        include: appointmentInclude,
      });
      if (appointment.status === 'CANCELLED') {
        return { appointment: toAppointmentDto(appointment), changed: false };
      }
      if (appointment.status === 'COMPLETED') {
        throw new ApiException(
          HttpStatus.CONFLICT,
          'INVALID_APPOINTMENT_STATE',
          'A completed appointment cannot be cancelled',
        );
      }

      const cancelledAt = new Date();
      const occupancyEnd = new Date(
        Math.max(
          appointment.scheduledStart.getTime(),
          Math.min(appointment.scheduledEnd.getTime(), cancelledAt.getTime()),
        ),
      );
      const updated = await tx.appointment.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt,
          occupancyEnd,
        },
        include: appointmentInclude,
      });
      return { appointment: toAppointmentDto(updated), changed: true };
    });

    this.logger.log({
      event: result.changed
        ? 'appointment.cancelled'
        : 'appointment.cancel_replayed',
      appointmentId: result.appointment.id,
    });
    return result.appointment;
  }

  async completeAppointment(id: string): Promise<AppointmentDto> {
    const appointment = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT id FROM appointments WHERE id = ${id}::uuid FOR UPDATE`,
      );
      if (!locked.length) {
        throw new ApiException(
          HttpStatus.NOT_FOUND,
          'RESOURCE_NOT_FOUND',
          'Appointment was not found',
        );
      }

      const current = await tx.appointment.findUniqueOrThrow({
        where: { id },
        include: appointmentInclude,
      });
      if (current.status === 'COMPLETED') {
        throw new ApiException(
          HttpStatus.CONFLICT,
          'APPOINTMENT_ALREADY_COMPLETED',
          'Appointment already completed',
        );
      }
      if (current.status === 'CANCELLED') {
        throw new ApiException(
          HttpStatus.CONFLICT,
          'INVALID_APPOINTMENT_STATE',
          'A cancelled appointment cannot be completed',
        );
      }

      const actualCompletedAt = new Date();
      if (actualCompletedAt < current.scheduledStart) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          'INVALID_APPOINTMENT_STATE',
          'Appointment cannot be completed before its scheduled start',
        );
      }
      const occupancyEnd = new Date(
        Math.min(current.scheduledEnd.getTime(), actualCompletedAt.getTime()),
      );
      const updated = await tx.appointment.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          actualCompletedAt,
          occupancyEnd,
        },
        include: appointmentInclude,
      });
      return toAppointmentDto(updated);
    });

    this.logger.log({
      event: 'appointment.completed',
      appointmentId: appointment.id,
    });
    return appointment;
  }

  async createAppointment(
    idempotencyKey: string | undefined,
    body: CreateAppointmentDto,
  ): Promise<CreateResult> {
    if (!idempotencyKey || !isUUID(idempotencyKey)) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Idempotency-Key must be a valid UUID',
      );
    }

    const key = idempotencyKey.toLowerCase();
    const normalizedServiceIds = body.serviceIds.map((id) => id.toLowerCase());
    if (new Set(normalizedServiceIds).size !== normalizedServiceIds.length) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'serviceIds must contain distinct UUIDs',
      );
    }
    const hash = requestHash(body);
    const replay = await this.findReplay(key, hash);
    if (replay) return replay;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const appointment = await this.createInTransaction(key, hash, body);
        this.logger.log({
          event: 'appointment.created',
          appointmentId: appointment.id,
          dealershipId: appointment.dealership.id,
        });
        return { appointment, replayed: false };
      } catch (error) {
        const committed = await this.findReplay(key, hash);
        if (committed) return committed;

        if (isRetryableTransactionError(error) && attempt === 0) continue;
        if (isAllocationConstraintError(error)) {
          await this.throwCurrentConflict(body);
        }
        throw error;
      }
    }

    throw new ApiException(
      HttpStatus.SERVICE_UNAVAILABLE,
      'SERVICE_UNAVAILABLE',
      'Service temporarily unavailable; retry with the same booking request key',
    );
  }

  private async findReplay(
    requestKey: string,
    hash: string,
  ): Promise<CreateResult | null> {
    const existing = await this.prisma.appointment.findUnique({
      where: { requestKey },
      include: appointmentInclude,
    });
    if (!existing) return null;
    if (existing.requestHash !== hash) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'IDEMPOTENCY_KEY_REUSED',
        'This request key was already used with different booking content',
      );
    }
    this.logger.log({
      event: 'appointment.replayed',
      appointmentId: existing.id,
    });
    return { appointment: toAppointmentDto(existing), replayed: true };
  }

  private async createInTransaction(
    requestKey: string,
    hash: string,
    body: CreateAppointmentDto,
  ): Promise<AppointmentDto> {
    return this.prisma.$transaction(
      async (tx) => {
        const vehicle = await tx.vehicle.findUnique({
          where: { id: body.vehicleId },
          select: { customerId: true },
        });
        if (!vehicle) {
          throw new ApiException(
            HttpStatus.NOT_FOUND,
            'RESOURCE_NOT_FOUND',
            'Vehicle was not found',
          );
        }
        if (vehicle.customerId !== body.customerId) {
          throw new ApiException(
            HttpStatus.BAD_REQUEST,
            'INVALID_RELATIONSHIP',
            'Vehicle does not belong to the selected customer',
          );
        }

        const services = await tx.serviceType.findMany({
          where: { id: { in: body.serviceIds } },
          select: { id: true, name: true, durationMinutes: true },
          orderBy: { id: 'asc' },
        });
        if (services.length !== body.serviceIds.length) {
          throw new ApiException(
            HttpStatus.NOT_FOUND,
            'RESOURCE_NOT_FOUND',
            'A selected service type was not found',
          );
        }

        const technician = await tx.technician.findUnique({
          where: { id: body.technicianId },
          select: {
            dealershipId: true,
            serviceTypes: {
              where: { serviceTypeId: { in: body.serviceIds } },
              select: { serviceTypeId: true },
            },
          },
        });
        const serviceBay = await tx.serviceBay.findUnique({
          where: { id: body.serviceBayId },
          select: { dealershipId: true },
        });
        const dealership = await tx.dealership.findUnique({
          where: { id: body.dealershipId },
          select: { id: true },
        });
        if (!technician || !serviceBay || !dealership) {
          throw new ApiException(
            HttpStatus.NOT_FOUND,
            'RESOURCE_NOT_FOUND',
            'Dealership, technician, or service bay was not found',
          );
        }
        if (
          technician.dealershipId !== body.dealershipId ||
          serviceBay.dealershipId !== body.dealershipId
        ) {
          throw new ApiException(
            HttpStatus.BAD_REQUEST,
            'INVALID_RELATIONSHIP',
            'Technician and service bay must belong to the selected dealership',
          );
        }
        if (technician.serviceTypes.length !== body.serviceIds.length) {
          throw new ApiException(
            HttpStatus.BAD_REQUEST,
            'TECHNICIAN_NOT_QUALIFIED',
            'Technician must support every selected service',
          );
        }

        const totalDurationMinutes = services.reduce(
          (total, service) => total + service.durationMinutes,
          0,
        );
        const scheduledStart = new Date(body.scheduledStart);
        const scheduledEnd = addMinutes(scheduledStart, totalDurationMinutes);
        validateAppointmentSchedule(scheduledStart, scheduledEnd, new Date());

        const vehicleConflict = await tx.appointment.findFirst({
          where: {
            vehicleId: body.vehicleId,
            scheduledStart: { lt: scheduledEnd },
            occupancyEnd: { gt: scheduledStart },
          },
          select: { id: true },
        });
        if (vehicleConflict) {
          throw new ApiException(
            HttpStatus.CONFLICT,
            'VEHICLE_CONFLICT',
            'Vehicle has an overlapping appointment',
          );
        }
        const resourceConflict = await tx.appointment.findFirst({
          where: {
            scheduledStart: { lt: scheduledEnd },
            occupancyEnd: { gt: scheduledStart },
            OR: [
              { technicianId: body.technicianId },
              { serviceBayId: body.serviceBayId },
            ],
          },
          select: { id: true },
        });
        if (resourceConflict) {
          throw new ApiException(
            HttpStatus.CONFLICT,
            'RESOURCE_CONFLICT',
            'Selected technician or service bay is no longer available',
          );
        }

        const created = await tx.appointment.create({
          data: {
            customerId: body.customerId,
            vehicleId: body.vehicleId,
            dealershipId: body.dealershipId,
            technicianId: body.technicianId,
            serviceBayId: body.serviceBayId,
            scheduledStart,
            scheduledEnd,
            occupancyEnd: scheduledEnd,
            totalDurationMinutes,
            requestKey,
            requestHash: hash,
            services: {
              create: services.map((service) => ({
                serviceTypeId: service.id,
                name: service.name,
                durationMinutes: service.durationMinutes,
              })),
            },
          },
          include: appointmentInclude,
        });
        return toAppointmentDto(created);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async throwCurrentConflict(
    body: CreateAppointmentDto,
  ): Promise<never> {
    const start = new Date(body.scheduledStart);
    const services = await this.prisma.serviceType.findMany({
      where: { id: { in: body.serviceIds } },
      select: { durationMinutes: true },
    });
    const end = addMinutes(
      start,
      services.reduce((total, service) => total + service.durationMinutes, 0),
    );
    const vehicleConflict = await this.prisma.appointment.findFirst({
      where: {
        vehicleId: body.vehicleId,
        scheduledStart: { lt: end },
        occupancyEnd: { gt: start },
      },
      select: { id: true },
    });
    if (vehicleConflict) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'VEHICLE_CONFLICT',
        'Vehicle has an overlapping appointment',
      );
    }
    throw new ApiException(
      HttpStatus.CONFLICT,
      'RESOURCE_CONFLICT',
      'Selected technician or service bay is no longer available',
    );
  }
}
