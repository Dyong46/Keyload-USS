import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AvailabilityModule } from './availability/availability.module.js';
import { AppointmentModule } from './appointments/appointment.module.js';
import { RequestContextMiddleware } from './common/request-context.middleware.js';
import { validateEnvironment } from './config/environment.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { ReferenceDataModule } from './reference-data/reference-data.module.js';
import { TechnicianModule } from './technicians/technician.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    HealthModule,
    ReferenceDataModule,
    TechnicianModule,
    AvailabilityModule,
    AppointmentModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
