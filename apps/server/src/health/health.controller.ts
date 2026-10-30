import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService, type HealthResponse } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({
    operationId: 'getHealth',
    summary: 'Check API and database readiness',
  })
  @ApiResponse({ status: 200, description: 'API and database are ready.' })
  @ApiResponse({ status: 503, description: 'Database is unavailable.' })
  check(): Promise<HealthResponse> {
    return this.health.check();
  }
}
