import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { pinoConfig } from './common/logger/logger.config.js';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthController } from './health.controller.js';

/**
 * Root application module combining core infrastructure (config, logging, rate limiting),
 * database integration, global guards and filters, and other feature modules.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    LoggerModule.forRootAsync({ useFactory: pinoConfig }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    EventEmitterModule.forRoot(),
    PrismaModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
