import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  let capturedLogger: Logger | null = null;
  try {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });
    app.use(cookieParser());
    app.enableShutdownHooks();
    const logger = app.get(Logger);
    capturedLogger = logger;
    app.useLogger(logger);

    const corsOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
      : 'http://localhost:3000';

    app.enableCors({
      origin: corsOrigins,
      credentials: true,
    });

    app.setGlobalPrefix('api', { exclude: ['health'] });
    // We are exposing swagger ui for api in development only.
    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('Notes API')
        .setDescription('REST API for the collaborative notes application')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('docs', app, document);
    }

    const port = Number(process.env.PORT ?? 4000);
    await app.listen(port);

    logger.log(`Notes API listening on http://localhost:${port}`, 'Bootstrap');
  } catch (err: unknown) {
    if (capturedLogger) {
      capturedLogger.error({ err }, 'Error during application bootstrap');
    } else {
      console.error('Error during startup:', err);
    }
    process.exit(1);
  }
}

await bootstrap();
