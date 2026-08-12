import {
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Postgre (Neon) Based global database service using Prisma 7.
 * Handles database connection lifecycle, wraps connection based errors, and ensures sanitization of user entity.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly serviceLogger = new Logger(PrismaService.name);

  /**
   * Initializes Prisma Client instance with a Neon PostgreSQL driver adapter.
   */
  constructor(@Inject(ConfigService) configService: ConfigService) {
    const connectionString =
      configService?.get<string>('DATABASE_URL') ?? process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set. Copy .env.example to .env and fill it accordingly.',
      );
    }
    const adapter = new PrismaNeon({ connectionString });
    super({ adapter });
  }

  /**
   * Connects to the database when the NestJS main app module initializes.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (err: unknown) {
      this.serviceLogger.error(
        'Failed to establish database connection during module initialization',
        err,
      );
      throw err;
    }
  }

  /**
   * Properly disconnects from the database when the NestJS main app module destroys.
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
    } catch (err: unknown) {
      this.serviceLogger.error(
        'Error encountered while disconnecting database client on module destroy',
        err,
      );
    }
  }

  /**
   * Removes sensitive passwordhash field before user is returned to api calling response.
   */
  sanitizeUser<T extends { passwordHash?: string }>(
    user: T,
  ): Omit<T, 'passwordHash'> {
    const safe = { ...user };
    delete safe.passwordHash;
    return safe;
  }
}
