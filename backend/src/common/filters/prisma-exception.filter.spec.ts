import { expect } from 'chai';
import sinon from 'sinon';
import { type ArgumentsHost, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { PinoLogger } from 'nestjs-pino';
import { PrismaExceptionFilter } from './prisma-exception.filter.js';
import { Prisma } from '../../generated/prisma/client.js';

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let loggerMock: sinon.SinonStubbedInstance<PinoLogger>;
  let requestMock: Partial<Request>;
  let responseMock: {
    status: sinon.SinonStub;
    json: sinon.SinonStub;
  };
  let argumentsHostMock: ArgumentsHost;

  beforeEach(() => {
    loggerMock = {
      warn: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<PinoLogger>;

    filter = new PrismaExceptionFilter(loggerMock);

    requestMock = {};
    responseMock = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis(),
    };

    argumentsHostMock = {
      switchToHttp: sinon.stub().returns({
        getRequest: () => requestMock,
        getResponse: () => responseMock as unknown as Response,
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('P2002 returns 409 Conflict with friendly message', () => {
    const error = new Prisma.PrismaClientKnownRequestError('msg', {
      code: 'P2002',
      clientVersion: '7',
    });
    error.meta = { target: ['email'] };
    filter.catch(error, argumentsHostMock);
    expect(responseMock.status.calledWith(HttpStatus.CONFLICT)).to.be.true;
    expect(responseMock.json.firstCall.args[0].message).to.equal(
      'A record with this email already exists',
    );
  });

  it('P2025 returns 404 Not Found', () => {
    const error = new Prisma.PrismaClientKnownRequestError('msg', {
      code: 'P2025',
      clientVersion: '7',
    });
    filter.catch(error, argumentsHostMock);
    expect(responseMock.status.calledWith(HttpStatus.NOT_FOUND)).to.be.true;
  });

  it('P2003 returns 400 Bad Request', () => {
    const error = new Prisma.PrismaClientKnownRequestError('msg', {
      code: 'P2003',
      clientVersion: '7',
    });
    filter.catch(error, argumentsHostMock);
    expect(responseMock.status.calledWith(HttpStatus.BAD_REQUEST)).to.be.true;
  });

  it('Unknown Prisma error code returns 500', () => {
    const error = new Prisma.PrismaClientKnownRequestError('msg', {
      code: 'P9999',
      clientVersion: '7',
    });
    filter.catch(error, argumentsHostMock);
    expect(responseMock.status.calledWith(HttpStatus.INTERNAL_SERVER_ERROR)).to
      .be.true;
  });
});
