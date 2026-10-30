import { Module } from '@nestjs/common';
import { TechnicianController } from './technician.controller.js';
import { TechnicianService } from './technician.service.js';

@Module({
  controllers: [TechnicianController],
  providers: [TechnicianService],
})
export class TechnicianModule {}
