import { expect } from 'chai';
import * as sinon from 'sinon';
import { TemplatesController } from './templates.controller.js';
import type { TemplatesService } from './templates.service.js';

describe('TemplatesController', () => {
  let controller: TemplatesController;
  let serviceMock: {
    findAll: sinon.SinonStub;
    findOne: sinon.SinonStub;
  };
  let sandbox: sinon.SinonSandbox;

  const template = {
    id: 'meeting-notes',
    title: 'Meeting Notes',
    content: 'Notes body',
    tags: ['meeting'],
    category: 'Work',
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    serviceMock = {
      findAll: sandbox.stub().returns([template]),
      findOne: sandbox.stub().returns(template),
    };
    controller = new TemplatesController(
      serviceMock as unknown as TemplatesService,
    );
  });

  afterEach(() => sandbox.restore());

  it('findAll delegates to TemplatesService.findAll', () => {
    const result = controller.findAll();
    expect(serviceMock.findAll.calledOnce).to.be.true;
    expect(result).to.deep.equal([template]);
  });

  it('findOne delegates to TemplatesService.findOne with the given id', () => {
    const result = controller.findOne('meeting-notes');
    expect(serviceMock.findOne.calledOnceWith('meeting-notes')).to.be.true;
    expect(result).to.deep.equal(template);
  });
});
