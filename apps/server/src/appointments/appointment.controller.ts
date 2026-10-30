import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiException } from '../common/api-exception.js';
import {
  AppointmentDto,
  AppointmentIdParams,
  AppointmentListQueryDto,
  AppointmentListResponseDto,
  CreateAppointmentDto,
} from './appointment.dto.js';
import { AppointmentService } from './appointment.service.js';

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointments: AppointmentService) {}

  @Get()
  @ApiOperation({
    operationId: 'listAppointments',
    summary: 'Search and paginate appointments',
  })
  @ApiOkResponse({ type: AppointmentListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid filters or pagination.' })
  listAppointments(
    @Query() query: AppointmentListQueryDto,
  ): Promise<AppointmentListResponseDto> {
    return this.appointments.listAppointments(query);
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'getAppointment',
    summary: 'Get appointment details',
  })
  @ApiOkResponse({ type: AppointmentDto })
  @ApiBadRequestResponse({ description: 'Invalid appointment ID.' })
  @ApiNotFoundResponse({ description: 'Appointment was not found.' })
  getAppointment(
    @Param() params: AppointmentIdParams,
  ): Promise<AppointmentDto> {
    return this.appointments.getAppointment(params.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'cancelAppointment',
    summary: 'Cancel an uncompleted appointment',
  })
  @ApiOkResponse({ type: AppointmentDto })
  @ApiBadRequestResponse({ description: 'Invalid appointment ID or body.' })
  @ApiNotFoundResponse({ description: 'Appointment was not found.' })
  @ApiConflictResponse({ description: 'Completed appointment cannot cancel.' })
  cancelAppointment(
    @Param() params: AppointmentIdParams,
    @Body() body: Record<string, unknown> | undefined,
  ): Promise<AppointmentDto> {
    this.assertEmptyBody(body);
    return this.appointments.cancelAppointment(params.id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'completeAppointment',
    summary: 'Complete service and release remaining resources',
  })
  @ApiOkResponse({ type: AppointmentDto })
  @ApiBadRequestResponse({ description: 'Invalid appointment ID or body.' })
  @ApiNotFoundResponse({ description: 'Appointment was not found.' })
  @ApiConflictResponse({ description: 'Invalid lifecycle transition.' })
  completeAppointment(
    @Param() params: AppointmentIdParams,
    @Body() body: Record<string, unknown> | undefined,
  ): Promise<AppointmentDto> {
    this.assertEmptyBody(body);
    return this.appointments.completeAppointment(params.id);
  }

  @Post()
  @ApiOperation({
    operationId: 'createAppointment',
    summary: 'Confirm or replay a booking',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { format: 'uuid' },
  })
  @ApiCreatedResponse({
    type: AppointmentDto,
    description: 'Appointment created.',
  })
  @ApiOkResponse({
    type: AppointmentDto,
    description: 'Committed request replay.',
  })
  @ApiBadRequestResponse({ description: 'Invalid booking input.' })
  @ApiNotFoundResponse({ description: 'Referenced data was not found.' })
  @ApiConflictResponse({
    description: 'Booking conflict or reused request key.',
  })
  async createAppointment(
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: CreateAppointmentDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AppointmentDto> {
    const result = await this.appointments.createAppointment(
      idempotencyKey,
      body,
    );
    response.status((result.replayed ? 200 : 201) as HttpStatus);
    return result.appointment;
  }

  private assertEmptyBody(body: Record<string, unknown> | undefined): void {
    if (body && Object.keys(body).length > 0) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'This operation does not accept a request body',
      );
    }
  }
}
