import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import {
  DealershipDto,
  ServiceTypeDto,
} from '../reference-data/reference-data.dto.js';

export class TechnicianListQueryDto {
  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  dealershipId?: string;
}

export class TechnicianIdParamsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}

export class TechnicianServiceTypeParamsDto extends TechnicianIdParamsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceTypeId!: string;
}

export class UpdateTechnicianDto {
  @ApiProperty({ minLength: 1, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  name!: string;
}

export class CreateTechnicianDto extends UpdateTechnicianDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  dealershipId!: string;

  @ApiProperty({
    required: false,
    format: 'uuid',
    isArray: true,
    default: [],
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  serviceTypeIds: string[] = [];
}

export class TechnicianManagementDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: DealershipDto })
  dealership!: DealershipDto;

  @ApiProperty({ type: ServiceTypeDto, isArray: true })
  serviceTypes!: ServiceTypeDto[];
}
