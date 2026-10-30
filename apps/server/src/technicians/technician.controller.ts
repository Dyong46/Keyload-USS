import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateTechnicianDto,
  TechnicianIdParamsDto,
  TechnicianListQueryDto,
  TechnicianManagementDto,
  TechnicianServiceTypeParamsDto,
  UpdateTechnicianDto,
} from './technician.dto.js';
import { TechnicianService } from './technician.service.js';

@ApiTags('Technicians')
@Controller('technicians')
export class TechnicianController {
  constructor(private readonly technicians: TechnicianService) {}

  @Get()
  @ApiOperation({
    operationId: 'listTechnicians',
    summary: 'List technicians and their service qualifications',
  })
  @ApiOkResponse({ type: TechnicianManagementDto, isArray: true })
  listTechnicians(
    @Query() query: TechnicianListQueryDto,
  ): Promise<TechnicianManagementDto[]> {
    return this.technicians.listTechnicians(query);
  }

  @Post()
  @ApiOperation({
    operationId: 'createTechnician',
    summary: 'Create a technician with optional service qualifications',
  })
  @ApiCreatedResponse({ type: TechnicianManagementDto })
  @ApiNotFoundResponse({ description: 'Dealership or service was not found.' })
  @ApiConflictResponse({ description: 'Name already exists at dealership.' })
  createTechnician(
    @Body() body: CreateTechnicianDto,
  ): Promise<TechnicianManagementDto> {
    return this.technicians.createTechnician(body);
  }

  @Patch(':id')
  @ApiOperation({
    operationId: 'updateTechnician',
    summary: 'Update a technician',
  })
  @ApiOkResponse({ type: TechnicianManagementDto })
  @ApiNotFoundResponse({ description: 'Technician was not found.' })
  @ApiConflictResponse({ description: 'Name already exists at dealership.' })
  updateTechnician(
    @Param() params: TechnicianIdParamsDto,
    @Body() body: UpdateTechnicianDto,
  ): Promise<TechnicianManagementDto> {
    return this.technicians.updateTechnician(params.id, body);
  }

  @Put(':id/service-types/:serviceTypeId')
  @ApiOperation({
    operationId: 'attachTechnicianServiceType',
    summary: 'Attach a service qualification',
  })
  @ApiOkResponse({ type: TechnicianManagementDto })
  @ApiNotFoundResponse({ description: 'Technician or service was not found.' })
  attachServiceType(
    @Param() params: TechnicianServiceTypeParamsDto,
  ): Promise<TechnicianManagementDto> {
    return this.technicians.attachServiceType(params.id, params.serviceTypeId);
  }

  @Delete(':id/service-types/:serviceTypeId')
  @ApiOperation({
    operationId: 'detachTechnicianServiceType',
    summary: 'Detach a service qualification',
  })
  @ApiOkResponse({ type: TechnicianManagementDto })
  @ApiNotFoundResponse({ description: 'Technician or service was not found.' })
  detachServiceType(
    @Param() params: TechnicianServiceTypeParamsDto,
  ): Promise<TechnicianManagementDto> {
    return this.technicians.detachServiceType(params.id, params.serviceTypeId);
  }
}
