import { expect } from 'chai';
import * as sinon from 'sinon';
import { NotificationsController } from './notifications.controller.js';
import type { NotificationsService } from './notifications.service.js';
import type { SafeUser } from '../auth/auth.types.js';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let serviceMock: {
    findAll: sinon.SinonStub;
    unreadCount: sinon.SinonStub;
    markRead: sinon.SinonStub;
    markAllRead: sinon.SinonStub;
    remove: sinon.SinonStub;
  };
  let sandbox: sinon.SinonSandbox;

  const currentUser = {
    id: 'user-1',
    email: 'jane@example.com',
    username: 'janedoe',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as SafeUser;

  const notification = {
    id: 'notif-1',
    userId: 'user-1',
    type: 'NOTE_EDITED' as const,
    payload: {},
    readAt: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    serviceMock = {
      findAll: sandbox.stub().resolves({
        data: [notification],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      unreadCount: sandbox.stub().resolves(2),
      markRead: sandbox
        .stub()
        .resolves({ ...notification, readAt: new Date() }),
      markAllRead: sandbox.stub().resolves({ updated: 2 }),
      remove: sandbox.stub().resolves(undefined),
    };
    controller = new NotificationsController(
      serviceMock as unknown as NotificationsService,
    );
  });

  afterEach(() => sandbox.restore());

  it('findAll delegates to NotificationsService.findAll', async () => {
    const query = { page: 1, limit: 20, unreadOnly: false };
    await controller.findAll(currentUser, query);
    expect(serviceMock.findAll.calledOnceWith('user-1', query)).to.be.true;
  });

  it('unreadCount delegates and wraps the count in an object', async () => {
    const result = await controller.unreadCount(currentUser);
    expect(serviceMock.unreadCount.calledOnceWith('user-1')).to.be.true;
    expect(result).to.deep.equal({ count: 2 });
  });

  it('markRead delegates to NotificationsService.markRead', async () => {
    await controller.markRead(currentUser, 'notif-1');
    expect(serviceMock.markRead.calledOnceWith('user-1', 'notif-1')).to.be.true;
  });

  it('markAllRead delegates to NotificationsService.markAllRead', async () => {
    const result = await controller.markAllRead(currentUser);
    expect(serviceMock.markAllRead.calledOnceWith('user-1')).to.be.true;
    expect(result).to.deep.equal({ updated: 2 });
  });

  it('remove delegates to NotificationsService.remove', async () => {
    await controller.remove(currentUser, 'notif-1');
    expect(serviceMock.remove.calledOnceWith('user-1', 'notif-1')).to.be.true;
  });
});
