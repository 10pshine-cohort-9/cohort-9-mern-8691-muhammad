import { expect } from 'chai';
import sinon from 'sinon';
import {
  HealthCheckService,
  HttpHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';

import { HealthController } from './health.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('HealthController', () => {
  let controller: HealthController;

  let health: sinon.SinonStubbedInstance<HealthCheckService>;
  let http: sinon.SinonStubbedInstance<HttpHealthIndicator>;
  let prismaHealth: sinon.SinonStubbedInstance<PrismaHealthIndicator>;
  let prisma: PrismaService;

  beforeEach(() => {
    health = sinon.createStubInstance(HealthCheckService);
    http = sinon.createStubInstance(HttpHealthIndicator);
    prismaHealth = sinon.createStubInstance(PrismaHealthIndicator);

    prisma = {} as PrismaService;

    health.check.resolves({
      status: 'ok',
      info: {},
      error: {},
      details: {},
    });

    controller = new HealthController(health, http, prismaHealth, prisma);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should execute both health checks', async () => {
    await controller.check();
    expect(health.check.calledOnce).to.equal(true);
    const checks = health.check.firstCall.args[0];
    expect(checks).to.have.length(2);
    await checks[0]();
    await checks[1]();
    expect(http.pingCheck.calledOnce).to.equal(true);
    expect(prismaHealth.pingCheck.calledOnce).to.equal(true);
  });
});
