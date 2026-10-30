import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pg from 'pg';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool: pg.Pool;

  constructor(config: ConfigService) {
    this.pool = new pg.Pool({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
      max: 10,
    });
  }

  async ping(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  getPool(): pg.Pool {
    return this.pool;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
