import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CustomerDto,
  CustomerIdParams,
  CustomerSearchQueryDto,
  CreateCustomerDto,
  CreateServiceTypeDto,
  CreateVehicleDto,
  DealershipDto,
  ServiceTypeDto,
  ServiceTypeIdParams,
  UpdateCustomerDto,
  UpdateServiceTypeDto,
  VehicleDto,
} from './reference-data.dto.js';
import { ReferenceDataService } from './reference-data.service.js';

@ApiTags('Reference data')
@Controller()
export class ReferenceDataController {
  constructor(private readonly referenceData: ReferenceDataService) {}

  @Get('customers')
  @ApiOperation({
    operationId: 'listCustomers',
    summary: 'Search customers by name, phone, or registration',
  })
  @ApiOkResponse({ type: CustomerDto, isArray: true })
  listCustomers(
    @Query() query: CustomerSearchQueryDto,
  ): Promise<CustomerDto[]> {
    return this.referenceData.listCustomers(query);
  }

  @Post('customers')
  @ApiOperation({ operationId: 'createCustomer', summary: 'Create a customer' })
  @ApiCreatedResponse({ type: CustomerDto })
  @ApiConflictResponse({ description: 'Phone already exists.' })
  createCustomer(@Body() body: CreateCustomerDto): Promise<CustomerDto> {
    return this.referenceData.createCustomer(body);
  }

  @Patch('customers/:id')
  @ApiOperation({ operationId: 'updateCustomer', summary: 'Update a customer' })
  @ApiOkResponse({ type: CustomerDto })
  @ApiNotFoundResponse({ description: 'Customer was not found.' })
  @ApiConflictResponse({ description: 'Phone already exists.' })
  updateCustomer(
    @Param() params: CustomerIdParams,
    @Body() body: UpdateCustomerDto,
  ): Promise<CustomerDto> {
    return this.referenceData.updateCustomer(params.id, body);
  }

  @Get('customers/:id/vehicles')
  @ApiOperation({
    operationId: 'listCustomerVehicles',
    summary: 'List vehicles owned by a customer',
  })
  @ApiOkResponse({ type: VehicleDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Customer was not found.' })
  listCustomerVehicles(
    @Param() params: CustomerIdParams,
  ): Promise<VehicleDto[]> {
    return this.referenceData.listCustomerVehicles(params.id);
  }

  @Post('customers/:id/vehicles')
  @ApiOperation({
    operationId: 'createCustomerVehicle',
    summary: 'Add a vehicle owned by a customer',
  })
  @ApiCreatedResponse({ type: VehicleDto })
  @ApiNotFoundResponse({ description: 'Customer was not found.' })
  @ApiConflictResponse({ description: 'Registration already exists.' })
  createCustomerVehicle(
    @Param() params: CustomerIdParams,
    @Body() body: CreateVehicleDto,
  ): Promise<VehicleDto> {
    return this.referenceData.createCustomerVehicle(params.id, body);
  }

  @Get('dealerships')
  @ApiOperation({
    operationId: 'listDealerships',
    summary: 'List sample dealerships',
  })
  @ApiOkResponse({ type: DealershipDto, isArray: true })
  listDealerships(): Promise<DealershipDto[]> {
    return this.referenceData.listDealerships();
  }

  @Get('service-types')
  @ApiOperation({
    operationId: 'listServiceTypes',
    summary: 'List service types with fixed durations',
  })
  @ApiOkResponse({ type: ServiceTypeDto, isArray: true })
  listServiceTypes(): Promise<ServiceTypeDto[]> {
    return this.referenceData.listServiceTypes();
  }

  @Post('service-types')
  @ApiOperation({
    operationId: 'createServiceType',
    summary: 'Create a service type',
  })
  @ApiCreatedResponse({ type: ServiceTypeDto })
  @ApiConflictResponse({ description: 'Service name already exists.' })
  createServiceType(
    @Body() body: CreateServiceTypeDto,
  ): Promise<ServiceTypeDto> {
    return this.referenceData.createServiceType(body);
  }

  @Patch('service-types/:id')
  @ApiOperation({
    operationId: 'updateServiceType',
    summary: 'Update a service type for future bookings',
  })
  @ApiOkResponse({ type: ServiceTypeDto })
  @ApiNotFoundResponse({ description: 'Service type was not found.' })
  @ApiConflictResponse({ description: 'Service name already exists.' })
  updateServiceType(
    @Param() params: ServiceTypeIdParams,
    @Body() body: UpdateServiceTypeDto,
  ): Promise<ServiceTypeDto> {
    return this.referenceData.updateServiceType(params.id, body);
  }
}
