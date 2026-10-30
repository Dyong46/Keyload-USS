import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [DatabaseService, PrismaService],
  exports: [DatabaseService, PrismaService],
})
export class DatabaseModule {}
