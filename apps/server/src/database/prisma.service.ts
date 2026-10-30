import {
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { DatabaseService } from './database.service.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnApplicationShutdown
{
  constructor(database: DatabaseService) {
    super({
      adapter: new PrismaPg(database.getPool(), { schema: 'public' }),
      transactionOptions: {
        maxWait: 2_000,
        timeout: 10_000,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.$disconnect();
  }
}
