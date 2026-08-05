import { Controller, Get } from '@nestjs/common';

/**
 * Interface for structured response returned by the health check endpoint.
 */
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
}

/**
 * Health check controller for container liveness check.
 */
@Controller('health')
export class HealthController {
  /**
   * Returns current running status and timestamp.
   *
   * @returns {HealthCheckResponse} Operational status payload.
   */
  @Get()
  check(): HealthCheckResponse {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
