import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  const logger = app.get(Logger);
  app.useLogger(logger);

  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : 'http://localhost:3000';

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api', { exclude: ['health'] });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);

  logger.log(`Notes API listening on http://localhost:${port}`, 'Bootstrap');
}

try {
  await bootstrap();
} catch (err: unknown) {
  console.error('Error during startup:', err);
  process.exit(1);
}
