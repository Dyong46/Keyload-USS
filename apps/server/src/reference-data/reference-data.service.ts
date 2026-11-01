import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ApiException } from '../common/api-exception.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type {
  CustomerDto,
  CustomerSearchQueryDto,
  CreateCustomerDto,
  CreateServiceTypeDto,
  CreateVehicleDto,
  DealershipDto,
  ServiceBayDto,
  ServiceTypeDto,
  UpdateCustomerDto,
  UpdateServiceTypeDto,
  VehicleDto,
} from './reference-data.dto.js';

@Injectable()
export class ReferenceDataService {
  private readonly logger = new Logger(ReferenceDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  listCustomers(query: CustomerSearchQueryDto): Promise<CustomerDto[]> {
    const search = query.search?.trim();
    if (!search) {
      return this.prisma.customer.findMany({
        select: { id: true, name: true, phone: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: query.limit,
      });
    }

    const namePrefix = `${escapeLike(search)}%`;
    const phonePrefix = `${escapeLike(phoneLookupPrefix(search))}%`;
    const registrationLookup = search.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const registrationPrefix = `${escapeLike(
      registrationLookup.length >= 2
        ? registrationLookup
        : '__NO_REGISTRATION_MATCH__',
    )}%`;
    return this.prisma.$queryRaw<CustomerDto[]>(Prisma.sql`
      SELECT matched.id, matched.name, matched.phone
      FROM (
        SELECT customer.id, customer.name, customer.phone
        FROM customers AS customer
        WHERE lower(customer.name) LIKE lower(${namePrefix}) ESCAPE '\\'
        UNION
        SELECT customer.id, customer.name, customer.phone
        FROM customers AS customer
        WHERE customer.phone LIKE ${phonePrefix} ESCAPE '\\'
        UNION
        SELECT customer.id, customer.name, customer.phone
        FROM vehicles AS vehicle
        JOIN customers AS customer ON customer.id = vehicle.customer_id
        WHERE vehicle.registration_number_normalized LIKE ${registrationPrefix} ESCAPE '\\'
      ) AS matched
      ORDER BY matched.name ASC, matched.id ASC
      LIMIT ${query.limit}
    `);
  }

  async createCustomer(input: CreateCustomerDto): Promise<CustomerDto> {
    const phone = normalizePhone(input.phone);
    try {
      const customer = await this.prisma.customer.create({
        data: { name: input.name.trim(), phone },
        select: { id: true, name: true, phone: true },
      });
      this.logger.log({ event: 'customer.created', customerId: customer.id });
      return customer;
    } catch (error) {
      this.throwUniqueConflict(
        error,
        'A customer with this phone already exists',
      );
      throw error;
    }
  }

  async updateCustomer(
    customerId: string,
    input: UpdateCustomerDto,
  ): Promise<CustomerDto> {
    this.assertUpdateHasValues(input);
    try {
      const customer = await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.phone !== undefined
            ? { phone: normalizePhone(input.phone) }
            : {}),
        },
        select: { id: true, name: true, phone: true },
      });
      this.logger.log({ event: 'customer.updated', customerId });
      return customer;
    } catch (error) {
      this.throwWriteError(
        error,
        'A customer with this phone already exists',
        'Customer was not found',
      );
      throw error;
    }
  }

  async listCustomerVehicles(customerId: string): Promise<VehicleDto[]> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customer) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'RESOURCE_NOT_FOUND',
        'Customer was not found',
      );
    }

    return this.prisma.vehicle.findMany({
      where: { customerId },
      select: {
        id: true,
        customerId: true,
        registrationNumber: true,
        make: true,
        model: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async createCustomerVehicle(
    customerId: string,
    input: CreateVehicleDto,
  ): Promise<VehicleDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'RESOURCE_NOT_FOUND',
        'Customer was not found',
      );
    }

    const registrationNumber = input.registrationNumber.trim().toUpperCase();
    const registrationNumberNormalized =
      normalizeRegistrationNumber(registrationNumber);
    try {
      const vehicle = await this.prisma.vehicle.create({
        data: {
          customerId,
          registrationNumber,
          registrationNumberNormalized,
          make: input.make.trim(),
          model: input.model.trim(),
        },
        select: {
          id: true,
          customerId: true,
          registrationNumber: true,
          make: true,
          model: true,
        },
      });
      this.logger.log({
        event: 'vehicle.created',
        customerId,
        vehicleId: vehicle.id,
      });
      return vehicle;
    } catch (error) {
      this.throwUniqueConflict(
        error,
        'A vehicle with this registration already exists',
      );
      throw error;
    }
  }

  listDealerships(): Promise<DealershipDto[]> {
    return this.prisma.dealership.findMany({
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
  }

  async listServiceBays(dealershipId: string): Promise<ServiceBayDto[]> {
    const dealership = await this.prisma.dealership.findUnique({
      where: { id: dealershipId },
      select: { id: true },
    });
    if (!dealership) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'RESOURCE_NOT_FOUND',
        'Dealership was not found',
      );
    }
    return this.prisma.serviceBay.findMany({
      where: { dealershipId },
      select: { id: true, label: true, dealershipId: true },
      orderBy: { id: 'asc' },
    });
  }

  listServiceTypes(): Promise<ServiceTypeDto[]> {
    return this.prisma.serviceType.findMany({
      select: { id: true, name: true, durationMinutes: true },
      orderBy: { id: 'asc' },
    });
  }

  async createServiceType(
    input: CreateServiceTypeDto,
  ): Promise<ServiceTypeDto> {
    try {
      const serviceType = await this.prisma.serviceType.create({
        data: {
          name: input.name.trim(),
          durationMinutes: input.durationMinutes,
        },
        select: { id: true, name: true, durationMinutes: true },
      });
      this.logger.log({
        event: 'service_type.created',
        serviceTypeId: serviceType.id,
      });
      return serviceType;
    } catch (error) {
      this.throwUniqueConflict(
        error,
        'A service with this name already exists',
      );
      throw error;
    }
  }

  async updateServiceType(
    serviceTypeId: string,
    input: UpdateServiceTypeDto,
  ): Promise<ServiceTypeDto> {
    this.assertUpdateHasValues(input);
    try {
      const serviceType = await this.prisma.serviceType.update({
        where: { id: serviceTypeId },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.durationMinutes !== undefined
            ? { durationMinutes: input.durationMinutes }
            : {}),
        },
        select: { id: true, name: true, durationMinutes: true },
      });
      this.logger.log({ event: 'service_type.updated', serviceTypeId });
      return serviceType;
    } catch (error) {
      this.throwWriteError(
        error,
        'A service with this name already exists',
        'Service type was not found',
      );
      throw error;
    }
  }

  private throwUniqueConflict(error: unknown, message: string): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ApiException(HttpStatus.CONFLICT, 'RESOURCE_CONFLICT', message);
    }
  }

  private throwWriteError(
    error: unknown,
    conflictMessage: string,
    notFoundMessage: string,
  ): void {
    this.throwUniqueConflict(error, conflictMessage);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'RESOURCE_NOT_FOUND',
        notFoundMessage,
      );
    }
  }

  private assertUpdateHasValues(input: object): void {
    if (!Object.values(input).some((value) => value !== undefined)) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'At least one field must be provided',
      );
    }
  }
}

export function normalizePhone(value: string): string {
  const compact = value.trim().replace(/[()\s.-]/g, '');
  let normalized = compact;
  if (/^0\d+$/.test(compact)) normalized = `+84${compact.slice(1)}`;
  else if (/^84\d+$/.test(compact)) normalized = `+${compact}`;

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'phone must be a valid international or Vietnamese number',
    );
  }
  return normalized;
}

export function normalizeRegistrationNumber(value: string): string {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalized.length < 3) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'registrationNumber must contain at least 3 letters or digits',
    );
  }
  return normalized;
}

function phoneLookupPrefix(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '__NO_PHONE_MATCH__';
  if (digits.startsWith('0')) return `+84${digits.slice(1)}`;
  if (digits.startsWith('84')) return `+${digits}`;
  if (value.trim().startsWith('+')) return `+${digits}`;
  return `__NO_PHONE_MATCH__${digits}`;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
