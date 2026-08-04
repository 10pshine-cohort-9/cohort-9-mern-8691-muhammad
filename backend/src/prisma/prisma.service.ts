import { Inject, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from './generated-client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(ConfigService) configService: ConfigService) {
    const connectionString = configService?.get<string>('DATABASE_URL') ?? process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set. Copy .env.example to .env and fill it in with the required details.',
      );
    }
    const adapter = new PrismaNeon({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  sanitizeUser<T extends { passwordHash?: string }>(user: T): Omit<T, 'passwordHash'> {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
