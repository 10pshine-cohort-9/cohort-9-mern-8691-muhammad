import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  app.useGlobalPipes(new ZodValidationPipe());

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}

bootstrap();
