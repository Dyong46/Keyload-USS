import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DEMO_STAFF } from '../common/demo-staff.js';
import { DatabaseService } from '../database/database.service.js';

export type HealthResponse = {
  status: 'ok';
  database: 'up';
  timestamp: string;
  demoStaff: typeof DEMO_STAFF;
};

@Injectable()
export class HealthService {
  constructor(private readonly database: DatabaseService) {}

  async check(): Promise<HealthResponse> {
    try {
      await this.database.ping();
    } catch {
      throw new ServiceUnavailableException({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database is unavailable',
      });
    }

    return {
      status: 'ok',
      database: 'up',
      timestamp: new Date().toISOString(),
      demoStaff: DEMO_STAFF,
    };
  }
}
