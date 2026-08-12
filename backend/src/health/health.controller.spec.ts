import { expect } from 'chai';
import sinon from 'sinon';
import type {
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { HealthController } from './health.controller.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('HealthController', () => {
  let controller: HealthController;
  let health: sinon.SinonStubbedInstance<HealthCheckService>;
  let prismaHealth: sinon.SinonStubbedInstance<PrismaHealthIndicator>;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {} as PrismaService;
    prismaHealth = {
      pingCheck: sinon.stub().resolves({
        database: { status: 'up' },
      }),
    } as unknown as sinon.SinonStubbedInstance<PrismaHealthIndicator>;
    health = {
      check: sinon
        .stub()
        .callsFake(
          async (indicators: Array<() => Promise<HealthIndicatorResult>>) => {
            for (const indicator of indicators) {
              await indicator();
            }
            return {
              status: 'ok',
              info: { database: { status: 'up' } },
              error: {},
              details: { database: { status: 'up' } },
            } as HealthCheckResult;
          },
        ),
    } as unknown as sinon.SinonStubbedInstance<HealthCheckService>;

    controller = new HealthController(health, prismaHealth, prisma);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should execute health checks', async () => {
    await controller.check();

    expect(health.check.calledOnce).to.equal(true);
    expect(prismaHealth.pingCheck.calledOnce).to.equal(true);
    expect(prismaHealth.pingCheck.calledWith('database', prisma)).to.equal(
      true,
    );
  });
});
