import { expect } from 'chai';
import * as sinon from 'sinon';
import { NotFoundException } from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';
import {
  NotificationsService,
  type NotificationPayload,
} from './notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Stubbed<T> = {
  [K in keyof T]: sinon.SinonStub;
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaMock: {
    notification: Stubbed<{
      create: sinon.SinonStub;
      findMany: sinon.SinonStub;
      count: sinon.SinonStub;
      findUnique: sinon.SinonStub;
      update: sinon.SinonStub;
      updateMany: sinon.SinonStub;
      delete: sinon.SinonStub;
    }>;
    $transaction: sinon.SinonStub;
  };
  let loggerMock: {
    info: sinon.SinonStub;
    warn: sinon.SinonStub;
    error: sinon.SinonStub;
  };
  let sandbox: sinon.SinonSandbox;

  const userId = 'user-1';
  const otherUserId = 'user-2';

  const baseNotification = {
    id: 'notif-1',
    userId,
    type: 'COLLABORATOR_INVITED',
    payload: {
      noteId: 'note-1',
      noteTitle: 'Roadmap',
      inviterName: 'Jane Doe',
      permission: 'READ',
    },
    isRead: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    prismaMock = {
      notification: {
        create: sandbox.stub(),
        findMany: sandbox.stub(),
        count: sandbox.stub(),
        findUnique: sandbox.stub(),
        update: sandbox.stub(),
        updateMany: sandbox.stub(),
        delete: sandbox.stub(),
      },
      $transaction: sandbox.stub(),
    };
    loggerMock = {
      info: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
    };

    service = new NotificationsService(
      prismaMock as unknown as PrismaService,
      loggerMock as unknown as PinoLogger,
    );
  });

  afterEach(() => sandbox.restore());

  describe('create', () => {
    it('creates a notification for the given user', async () => {
      prismaMock.notification.create.resolves(baseNotification);
      const payload: NotificationPayload = {
        noteId: 'note-1',
        noteTitle: 'Roadmap',
        inviterName: 'Jane Doe',
        permission: 'READ',
      };
      const result = await service.create(
        userId,
        'COLLABORATOR_INVITED',
        payload,
      );
      expect(result).to.deep.equal(baseNotification);
      expect(prismaMock.notification.create.calledOnce).to.be.true;
    });
  });

  describe('findAll', () => {
    it('returns paginated notifications for the user, newest first', async () => {
      prismaMock.$transaction.resolves([[baseNotification], 1]);
      const result = await service.findAll(userId, {
        page: 1,
        limit: 20,
        unreadOnly: false,
      });
      expect(result.data).to.deep.equal([baseNotification]);
      expect(result.meta).to.deep.equal({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('filters to unread only when requested', async () => {
      prismaMock.$transaction.resolves([[], 0]);
      await service.findAll(userId, {
        page: 1,
        limit: 20,
        unreadOnly: true,
      });
      expect(prismaMock.$transaction.calledOnce).to.be.true;
    });
  });

  describe('unreadCount', () => {
    it('counts unread notifications for the user', async () => {
      prismaMock.notification.count.resolves(3);
      const count = await service.unreadCount(userId);
      expect(count).to.equal(3);
      expect(
        prismaMock.notification.count.calledOnceWith({
          where: { userId, readAt: null },
        }),
      ).to.be.true;
    });
  });

  describe('markRead', () => {
    it('marks an unread notification as read', async () => {
      prismaMock.notification.findUnique.resolves(baseNotification);
      prismaMock.notification.update.resolves({
        ...baseNotification,
        readAt: new Date(),
      });
      const result = await service.markRead(userId, 'notif-1');
      expect(result.readAt).to.not.be.null;
    });

    it('is a no-op (no extra write) when already read', async () => {
      const alreadyRead = {
        ...baseNotification,
        readAt: new Date('2026-01-02'),
      };
      prismaMock.notification.findUnique.resolves(alreadyRead);
      const result = await service.markRead(userId, 'notif-1');
      expect(result).to.deep.equal(alreadyRead);
      expect(prismaMock.notification.update.called).to.be.false;
    });

    it('throws NotFoundException for a notification belonging to another user', async () => {
      prismaMock.notification.findUnique.resolves({
        ...baseNotification,
        userId: otherUserId,
      });
      try {
        await service.markRead(userId, 'notif-1');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
      }
    });

    it('throws NotFoundException for a missing notification', async () => {
      prismaMock.notification.findUnique.resolves(null);
      try {
        await service.markRead(userId, 'missing');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
      }
    });
  });

  describe('markAllRead', () => {
    it('marks every unread notification for the user as read', async () => {
      prismaMock.notification.updateMany.resolves({ count: 5 });
      const result = await service.markAllRead(userId);
      expect(result).to.deep.equal({ updated: 5 });
      expect(
        prismaMock.notification.updateMany.calledOnceWith({
          where: { userId, readAt: null },
          data: sinon.match.has('readAt'),
        }),
      ).to.be.true;
    });
  });

  describe('remove', () => {
    it('deletes a notification owned by the user', async () => {
      prismaMock.notification.findUnique.resolves(baseNotification);
      prismaMock.notification.delete.resolves(baseNotification);
      await service.remove(userId, 'notif-1');
      expect(
        prismaMock.notification.delete.calledOnceWith({
          where: { id: 'notif-1' },
        }),
      ).to.be.true;
    });

    it('throws NotFoundException when deleting a notification owned by another user', async () => {
      prismaMock.notification.findUnique.resolves({
        ...baseNotification,
        userId: otherUserId,
      });
      try {
        await service.remove(userId, 'notif-1');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
        expect(prismaMock.notification.delete.called).to.be.false;
      }
    });
  });
});
