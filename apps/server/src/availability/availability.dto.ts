import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  dealershipId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    minItems: 1,
    uniqueItems: true,
  })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  serviceIds!: string[];

  @ApiProperty({ example: '2026-11-05', pattern: '^\\d{4}-\\d{2}-\\d{2}$' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;
}

export class AvailabilityServiceTypeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ minimum: 1 })
  durationMinutes!: number;
}

export class AvailableTechnicianDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'uuid' })
  dealershipId!: string;
}

export class AvailableServiceBayDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ format: 'uuid' })
  dealershipId!: string;
}

export class AvailabilitySlotDto {
  @ApiProperty({ format: 'date-time' })
  scheduledStart!: string;

  @ApiProperty({ format: 'date-time' })
  scheduledEnd!: string;

  @ApiProperty({ type: [AvailableTechnicianDto] })
  technicians!: AvailableTechnicianDto[];

  @ApiProperty({ type: [AvailableServiceBayDto] })
  serviceBays!: AvailableServiceBayDto[];

  @ApiProperty({ format: 'uuid' })
  suggestedTechnicianId!: string;

  @ApiProperty({ format: 'uuid' })
  suggestedServiceBayId!: string;
}

export class AvailabilityResponseDto {
  @ApiProperty({ format: 'uuid' })
  dealershipId!: string;

  @ApiProperty({ format: 'uuid' })
  vehicleId!: string;

  @ApiProperty({ example: '2026-11-05' })
  date!: string;

  @ApiProperty({ enum: ['Asia/Ho_Chi_Minh'] })
  timeZone!: 'Asia/Ho_Chi_Minh';

  @ApiProperty({ format: 'date-time' })
  generatedAt!: string;

  @ApiProperty({ type: [AvailabilityServiceTypeDto] })
  services!: AvailabilityServiceTypeDto[];

  @ApiProperty({ minimum: 1 })
  totalDurationMinutes!: number;

  @ApiProperty({ type: [AvailabilitySlotDto] })
  slots!: AvailabilitySlotDto[];
}
