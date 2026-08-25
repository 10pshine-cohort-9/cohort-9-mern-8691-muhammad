import { expect } from 'chai';
import sinon from 'sinon';
import {
  type ArgumentsHost,
  BadRequestException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { PinoLogger } from 'nestjs-pino';

import type { SafeUser } from '../../auth/auth.types.js';
import {
  type ApiErrorResponse,
  GlobalExceptionFilter,
} from './global-exception.filter.js';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let loggerMock: sinon.SinonStubbedInstance<PinoLogger>;
  let requestMock: Partial<Request>;
  let responseMock: {
    status: sinon.SinonStub;
    json: sinon.SinonStub;
  };
  let argumentsHostMock: ArgumentsHost;

  const mockUser: SafeUser = {
    id: 'User786',
    email: 'user786@example.com',
    username: 'safeuser',
  };

  beforeEach(() => {
    loggerMock = {
      setContext: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<PinoLogger>;

    filter = new GlobalExceptionFilter(loggerMock);

    requestMock = {
      url: '/api/note',
      method: 'POST',
      user: mockUser,
    };

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

  describe('HttpException.NonServerIssues', () => {
    it('provides formatted response body and 400 status code for BadRequestException', () => {
      const exception = new BadRequestException('Invalid input payload');
      filter.catch(exception, argumentsHostMock);
      expect(responseMock.status.calledWith(HttpStatus.BAD_REQUEST)).to.equal(
        true,
      );
      const body = responseMock.json.firstCall.args[0] as ApiErrorResponse;
      expect(body.success).to.equal(false);
      expect(body.statusCode).to.equal(HttpStatus.BAD_REQUEST);
      expect(body.message).to.equal('Invalid input payload');
    });

    it('handles array of error messages from validation exceptions', () => {
      const validationMessages = [
        'Email is Invalid',
        'Password Must be at least 8 character long',
      ];
      const exception = new BadRequestException({
        message: validationMessages,
        error: 'Bad Request',
      });

      filter.catch(exception, argumentsHostMock);

      const body = responseMock.json.firstCall.args[0] as ApiErrorResponse;
      expect(body.success).to.equal(false);
      expect(body.message).to.deep.equal(validationMessages);
    });

    it('logs a warning for under 500 status codes', () => {
      const exception = new BadRequestException('Invalid query parameter');

      filter.catch(exception, argumentsHostMock);

      expect(loggerMock.warn.calledOnce).to.equal(true);
      expect(loggerMock.error.called).to.equal(false);
    });
  });

  describe('HttpException.ServerIssues', () => {
    it('logs error for 500 server exceptions and returns generic message', () => {
      const exception = new InternalServerErrorException(
        'Secret DB connection string: password123',
      );

      filter.catch(exception, argumentsHostMock);

      expect(loggerMock.error.calledOnce).to.equal(true);
      expect(loggerMock.warn.called).to.equal(false);
      const body = responseMock.json.firstCall.args[0] as ApiErrorResponse;
      expect(body.message).to.equal('Internal server error');
      expect(JSON.stringify(body)).not.to.include(
        'Secret DB connection string',
      );
    });
  });

  describe('Non-HttpExceptions', () => {
    it('sets the status to default 500 and puts generic message', () => {
      const error = new Error('Database connection failed');

      filter.catch(error, argumentsHostMock);

      expect(
        responseMock.status.calledWith(HttpStatus.INTERNAL_SERVER_ERROR),
      ).to.equal(true);

      const body = responseMock.json.firstCall.args[0] as ApiErrorResponse;
      expect(body.success).to.equal(false);
      expect(body.statusCode).to.equal(500);
      expect(body.message).to.equal('Internal server error');

      expect(loggerMock.error.calledOnce).to.equal(true);
    });
  });

  it('handles non-Error thrown exceptions gracefully', () => {
    filter.catch('Just a string error', argumentsHostMock);
    expect(
      responseMock.status.calledWith(HttpStatus.INTERNAL_SERVER_ERROR),
    ).to.equal(true);
    const body = responseMock.json.firstCall.args[0] as ApiErrorResponse;
    expect(body.message).to.equal('Internal server error');
    expect(loggerMock.error.calledOnce).to.equal(true);
  });

  it('never leaks internal details for 500 errors', () => {
    const error = new Error('Secret DB connection string: password123');
    error.stack = 'Error: ... at someFile.ts:123';
    filter.catch(error, argumentsHostMock);
    const body = responseMock.json.firstCall.args[0] as ApiErrorResponse;
    expect(body.message).to.equal('Internal server error');
    expect(JSON.stringify(body)).not.to.include('Secret DB connection string');
    expect(JSON.stringify(body)).not.to.include('someFile.ts');
  });

  it('extractMessage handles nested error response objects', () => {
    const exception = new BadRequestException({ message: { nested: 'info' } });
    filter.catch(exception, argumentsHostMock);
    const body = responseMock.json.firstCall.args[0] as ApiErrorResponse;
    expect(body.message).to.deep.equal({ nested: 'info' });
  });
});
