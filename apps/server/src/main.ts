import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { configureApp } from './common/configure-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = new DocumentBuilder()
    .setTitle('USS API')
    .setDescription('Unified Service Scheduler API')
    .setVersion('1.2.0')
    .addTag('Health')
    .addTag('Reference data')
    .addTag('Technicians')
    .addTag('Availability')
    .addTag('Appointments')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 8000);
}
await bootstrap();
