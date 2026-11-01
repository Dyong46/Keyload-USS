import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CustomerIdParams {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}

export class DealershipIdParams {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}

export class ServiceTypeIdParams {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}

export class CustomerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: '+84912345678' })
  phone!: string;
}

export class CustomerSearchQueryDto {
  @ApiProperty({ required: false, description: 'Name, phone, or registration' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiProperty({ required: false, default: 10, minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit = 10;
}

export class CreateCustomerDto {
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ example: '0912 345 678' })
  @IsString()
  @Matches(/^[+()\d\s.-]{8,25}$/)
  phone!: string;
}

export class UpdateCustomerDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiProperty({ required: false, example: '0912 345 678' })
  @IsOptional()
  @IsString()
  @Matches(/^[+()\d\s.-]{8,25}$/)
  phone?: string;
}

export class CreateVehicleDto {
  @ApiProperty({ example: '51A-123.45' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 20)
  registrationNumber!: string;

  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 50)
  make!: string;

  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 50)
  model!: string;
}

export class VehicleDto {
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

export class DealershipDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class ServiceBayDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ format: 'uuid' })
  dealershipId!: string;
}

export class ServiceTypeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ minimum: 1 })
  durationMinutes!: number;
}

export class CreateServiceTypeDto {
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ minimum: 1, maximum: 540 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(540)
  durationMinutes!: number;
}

export class UpdateServiceTypeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 540 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(540)
  durationMinutes?: number;
}
