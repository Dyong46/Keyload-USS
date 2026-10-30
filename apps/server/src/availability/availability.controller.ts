import { Controller, Get, Header, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  AvailabilityQueryDto,
  AvailabilityResponseDto,
} from './availability.dto.js';
import { AvailabilityService } from './availability.service.js';

@ApiTags('Availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getAvailability',
    summary: 'Find eligible starts and resources',
  })
  @ApiOkResponse({ type: AvailabilityResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query or business date.' })
  @ApiNotFoundResponse({ description: 'Referenced data was not found.' })
  getAvailability(
    @Query() query: AvailabilityQueryDto,
  ): Promise<AvailabilityResponseDto> {
    return this.availability.getAvailability(query);
  }
}
