import { Module } from '@nestjs/common';
import { AppointmentController } from './appointment.controller.js';
import { AppointmentService } from './appointment.service.js';

@Module({
  controllers: [AppointmentController],
  providers: [AppointmentService],
})
export class AppointmentModule {}
