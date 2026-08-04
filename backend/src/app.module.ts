import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    EventEmitterModule.forRoot(),
    PrismaModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: GlobalExceptionFilter }],
})
export class AppModule {}
