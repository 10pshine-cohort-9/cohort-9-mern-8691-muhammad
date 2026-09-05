import { expect } from 'chai';
import * as sinon from 'sinon';
import { NotFoundException } from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';
import { TemplatesService } from './templates.service.js';
import { NOTE_TEMPLATES } from './templates.data.js';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let loggerMock: {
    info: sinon.SinonStub;
    warn: sinon.SinonStub;
    error: sinon.SinonStub;
    setContext: sinon.SinonStub;
  };
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    loggerMock = {
      info: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
      setContext: sandbox.stub(),
    };
    service = new TemplatesService(loggerMock as unknown as PinoLogger);
  });

  afterEach(() => sandbox.restore());

  describe('findAll', () => {
    it('returns the full static template catalog', () => {
      const result = service.findAll();
      expect(result).to.deep.equal(NOTE_TEMPLATES);
      expect(result.length).to.be.greaterThan(0);
    });

    it('every template has a unique id', () => {
      const ids = service.findAll().map((t) => t.id);
      expect(new Set(ids).size).to.equal(ids.length);
    });

    it('every template has non-empty title, content, and category', () => {
      service.findAll().forEach((t) => {
        expect(t.title).to.be.a('string').and.not.equal('');
        expect(t.content).to.be.an('object');
        expect(t.content).to.have.property('type', 'doc');
        expect(t.category).to.be.a('string').and.not.equal('');
      });
    });
  });

  describe('findOne', () => {
    it('returns the template matching the given id', () => {
      const result = service.findOne('meeting-notes');
      expect(result.id).to.equal('meeting-notes');
      expect(result.title).to.equal('Meeting Notes');
    });

    it('throws NotFoundException for an unknown id', () => {
      expect(() => service.findOne('does-not-exist')).to.throw(
        NotFoundException,
      );
      expect(loggerMock.warn.calledOnce).to.be.true;
    });
  });
});
