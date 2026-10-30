import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentStatus } from '../generated/prisma/client.js';

export class CreateAppointmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  dealershipId!: string;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    minItems: 1,
    uniqueItems: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  serviceIds!: string[];

  @ApiProperty({ format: 'date-time' })
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  scheduledStart!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  technicianId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceBayId!: string;
}

export class AppointmentCustomerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: '+84912345678' })
  phone!: string;
}

export class AppointmentVehicleDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  customerId!: string;

  @ApiProperty()
  registrationNumber!: string;

  @ApiProperty()
  make!: string;

  @ApiProperty()
  model!: string;
}

export class AppointmentDealershipDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class AppointmentServiceDto {
  @ApiProperty({ format: 'uuid' })
  serviceTypeId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ minimum: 1 })
  durationMinutes!: number;
}

export class AppointmentTechnicianDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'uuid' })
  dealershipId!: string;
}

export class AppointmentServiceBayDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ format: 'uuid' })
  dealershipId!: string;
}

export class AppointmentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: AppointmentCustomerDto })
  customer!: AppointmentCustomerDto;

  @ApiProperty({ type: AppointmentVehicleDto })
  vehicle!: AppointmentVehicleDto;

  @ApiProperty({ type: AppointmentDealershipDto })
  dealership!: AppointmentDealershipDto;

  @ApiProperty({ type: [AppointmentServiceDto] })
  services!: AppointmentServiceDto[];

  @ApiProperty({ minimum: 1 })
  totalDurationMinutes!: number;

  @ApiProperty({ type: AppointmentTechnicianDto })
  technician!: AppointmentTechnicianDto;

  @ApiProperty({ type: AppointmentServiceBayDto })
  serviceBay!: AppointmentServiceBayDto;

  @ApiProperty({ format: 'date-time' })
  scheduledStart!: string;

  @ApiProperty({ format: 'date-time' })
  scheduledEnd!: string;

  @ApiProperty({ enum: ['CONFIRMED', 'CANCELLED', 'COMPLETED'] })
  status!: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  cancelledAt!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  actualCompletedAt!: string | null;
}

export class AppointmentIdParams {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}

export class AppointmentListQueryDto {
  @ApiProperty({ format: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  dealershipId?: string;

  @ApiProperty({ example: '2026-11-05', required: false })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @ApiProperty({ enum: AppointmentStatus, required: false })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ minimum: 1, default: 1, required: false })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiProperty({ minimum: 1, maximum: 100, default: 20, required: false })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class AppointmentListResponseDto {
  @ApiProperty({ type: [AppointmentDto] })
  items!: AppointmentDto[];

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  pageSize!: number;

  @ApiProperty({ minimum: 0 })
  total!: number;
}
