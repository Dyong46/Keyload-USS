import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ApiException } from '../common/api-exception.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type {
  CreateTechnicianDto,
  TechnicianListQueryDto,
  TechnicianManagementDto,
  UpdateTechnicianDto,
} from './technician.dto.js';

const technicianSelect = {
  id: true,
  name: true,
  dealership: { select: { id: true, name: true } },
  serviceTypes: {
    select: {
      serviceType: {
        select: { id: true, name: true, durationMinutes: true },
      },
    },
    orderBy: { serviceTypeId: 'asc' },
  },
} satisfies Prisma.TechnicianSelect;

type TechnicianRecord = Prisma.TechnicianGetPayload<{
  select: typeof technicianSelect;
}>;

@Injectable()
export class TechnicianService {
  private readonly logger = new Logger(TechnicianService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listTechnicians(
    query: TechnicianListQueryDto,
  ): Promise<TechnicianManagementDto[]> {
    const technicians = await this.prisma.technician.findMany({
      where: query.dealershipId
        ? { dealershipId: query.dealershipId }
        : undefined,
      select: technicianSelect,
      orderBy: [{ dealershipId: 'asc' }, { id: 'asc' }],
    });
    return technicians.map(toDto);
  }

  async createTechnician(
    input: CreateTechnicianDto,
  ): Promise<TechnicianManagementDto> {
    const [dealership, serviceTypeCount] = await Promise.all([
      this.prisma.dealership.findUnique({
        where: { id: input.dealershipId },
        select: { id: true },
      }),
      this.prisma.serviceType.count({
        where: { id: { in: input.serviceTypeIds } },
      }),
    ]);
    if (!dealership || serviceTypeCount !== input.serviceTypeIds.length) {
      this.throwNotFound();
    }

    try {
      const technician = await this.prisma.$transaction(async (tx) => {
        const created = await tx.technician.create({
          data: {
            name: input.name.trim(),
            dealershipId: input.dealershipId,
          },
          select: { id: true },
        });
        if (input.serviceTypeIds.length) {
          await tx.technicianServiceType.createMany({
            data: input.serviceTypeIds.map((serviceTypeId) => ({
              technicianId: created.id,
              serviceTypeId,
            })),
          });
        }
        return tx.technician.findUniqueOrThrow({
          where: { id: created.id },
          select: technicianSelect,
        });
      });
      this.logger.log({
        event: 'technician.created',
        technicianId: technician.id,
        dealershipId: input.dealershipId,
        serviceTypeCount: input.serviceTypeIds.length,
      });
      return toDto(technician);
    } catch (error) {
      this.throwWriteError(error);
      throw error;
    }
  }

  async updateTechnician(
    technicianId: string,
    input: UpdateTechnicianDto,
  ): Promise<TechnicianManagementDto> {
    if (input.dealershipId) {
      const dealership = await this.prisma.dealership.findUnique({
        where: { id: input.dealershipId },
        select: { id: true },
      });
      if (!dealership) this.throwNotFound();
    }

    try {
      const technician = await this.prisma.technician.update({
        where: { id: technicianId },
        data: {
          name: input.name.trim(),
          dealershipId: input.dealershipId,
        },
        select: technicianSelect,
      });
      this.logger.log({
        event: 'technician.updated',
        technicianId,
        dealershipId: technician.dealership.id,
      });
      return toDto(technician);
    } catch (error) {
      this.throwWriteError(error);
      throw error;
    }
  }

  async attachServiceType(
    technicianId: string,
    serviceTypeId: string,
  ): Promise<TechnicianManagementDto> {
    await this.assertResourcesExist(technicianId, serviceTypeId);
    await this.prisma.technicianServiceType.upsert({
      where: { technicianId_serviceTypeId: { technicianId, serviceTypeId } },
      update: {},
      create: { technicianId, serviceTypeId },
    });
    this.logger.log({
      event: 'technician.service_type.attached',
      technicianId,
      serviceTypeId,
    });
    return this.getTechnician(technicianId);
  }

  async detachServiceType(
    technicianId: string,
    serviceTypeId: string,
  ): Promise<TechnicianManagementDto> {
    await this.assertResourcesExist(technicianId, serviceTypeId);
    await this.prisma.technicianServiceType.deleteMany({
      where: { technicianId, serviceTypeId },
    });
    this.logger.log({
      event: 'technician.service_type.detached',
      technicianId,
      serviceTypeId,
    });
    return this.getTechnician(technicianId);
  }

  private async getTechnician(
    technicianId: string,
  ): Promise<TechnicianManagementDto> {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
      select: technicianSelect,
    });
    if (!technician) this.throwNotFound();
    return toDto(technician);
  }

  private async assertResourcesExist(
    technicianId: string,
    serviceTypeId: string,
  ): Promise<void> {
    const [technician, serviceType] = await Promise.all([
      this.prisma.technician.findUnique({
        where: { id: technicianId },
        select: { id: true },
      }),
      this.prisma.serviceType.findUnique({
        where: { id: serviceTypeId },
        select: { id: true },
      }),
    ]);
    if (!technician || !serviceType) this.throwNotFound();
  }

  private throwWriteError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return;
    if (error.code === 'P2002') {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'RESOURCE_CONFLICT',
        'A technician with this name already exists at the dealership',
      );
    }
    if (error.code === 'P2025') this.throwNotFound();
  }

  private throwNotFound(): never {
    throw new ApiException(
      HttpStatus.NOT_FOUND,
      'RESOURCE_NOT_FOUND',
      'Technician or service type was not found',
    );
  }
}

function toDto(technician: TechnicianRecord): TechnicianManagementDto {
  return {
    id: technician.id,
    name: technician.name,
    dealership: technician.dealership,
    serviceTypes: technician.serviceTypes.map(({ serviceType }) => serviceType),
  };
}
