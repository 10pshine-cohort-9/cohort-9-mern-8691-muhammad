import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  PrismaHealthIndicator,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * A simple health controller to check whether our application server is live
 * and database is live
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.http.pingCheck('google', 'https://www.google.com'),
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }
}
