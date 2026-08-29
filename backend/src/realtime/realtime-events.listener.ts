import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { NotificationType } from '../generated/prisma/enums.js';
import type { Note } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { NotificationPayload } from '../notifications/notifications.service.js';
import { NotesGateway } from './notes.gateway.js';

interface NoteUpdatedEvent {
  note: Note;
  editedByUserId: string;
}

interface NoteDeletedEvent {
  noteId: string;
  deletedByUserId: string;
}

interface NoteEditedByCollaboratorEvent {
  noteId: string;
  noteTitle: string;
  editorUserId: string;
  recipientUserIds: string[];
}

interface CollaboratorInvitedEvent {
  noteId: string;
  noteTitle: string;
  inviterId: string;
  inviteeId: string;
  permission: 'READ' | 'WRITE';
}

interface CollaboratorPermissionChangedEvent {
  noteId: string;
  noteTitle: string;
  collaboratorUserId: string;
  permission: 'READ' | 'WRITE';
  changedByUserId: string;
}

interface CollaboratorRemovedEvent {
  noteId: string;
  noteTitle: string;
  collaboratorUserId: string;
  removedByUserId: string;
}

/**
 * This handles the events emitted from event emitter to initiate respective websocket and notification
 */
@Injectable()
export class RealtimeEventsListener {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly gateway: NotesGateway,
    @InjectPinoLogger(RealtimeEventsListener.name)
    private readonly logger: PinoLogger,
  ) {}

  @OnEvent('note.updated')
  handleNoteUpdated({ note, editedByUserId }: NoteUpdatedEvent): void {
    this.gateway.emitNoteUpdated(note, editedByUserId);
  }

  @OnEvent('note.deleted')
  handleNoteDeleted({ noteId, deletedByUserId }: NoteDeletedEvent): void {
    this.gateway.emitNoteDeleted(noteId, deletedByUserId);
  }

  @OnEvent('note.edited-by-collaborator')
  async handleNoteEditedByCollaborator(
    event: NoteEditedByCollaboratorEvent,
  ): Promise<void> {
    const editorName = await this.displayName(event.editorUserId);
    await Promise.all(
      event.recipientUserIds.map((recipientId) =>
        this.notifyAndPush(recipientId, NotificationType.NOTE_EDITED, {
          noteId: event.noteId,
          noteTitle: event.noteTitle,
          editorName,
        }),
      ),
    );
  }

  @OnEvent('collaborator.invited')
  async handleCollaboratorInvited(
    event: CollaboratorInvitedEvent,
  ): Promise<void> {
    const inviterName = await this.displayName(event.inviterId);
    await this.notifyAndPush(
      event.inviteeId,
      NotificationType.COLLABORATOR_INVITED,
      {
        noteId: event.noteId,
        noteTitle: event.noteTitle,
        inviterName,
        permission: event.permission,
      },
    );
  }

  @OnEvent('collaborator.permission-changed')
  async handlePermissionChanged(
    event: CollaboratorPermissionChangedEvent,
  ): Promise<void> {
    const changedByName = await this.displayName(event.changedByUserId);
    await this.notifyAndPush(
      event.collaboratorUserId,
      NotificationType.PERMISSION_CHANGED,
      {
        noteId: event.noteId,
        noteTitle: event.noteTitle,
        permission: event.permission,
        changedByName,
      },
    );
  }

  @OnEvent('collaborator.removed')
  async handleCollaboratorRemoved(
    event: CollaboratorRemovedEvent,
  ): Promise<void> {
    this.gateway.evictUserFromNoteRoom(event.collaboratorUserId, event.noteId);
    const removedByName = await this.displayName(event.removedByUserId);
    await this.notifyAndPush(
      event.collaboratorUserId,
      NotificationType.COLLABORATOR_REMOVED,
      {
        noteId: event.noteId,
        noteTitle: event.noteTitle,
        removedByName,
      },
    );
  }

  private async notifyAndPush(
    userId: string,
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<void> {
    try {
      const notification = await this.notifications.create(
        userId,
        type,
        payload,
      );
      this.gateway.emitNotification(userId, notification);
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        { userId, type, err: errorObj },
        'Failed to create/push notification',
      );
    }
  }

  private async displayName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, username: true },
    });
    return user ? user.name || user.username : 'Someone';
  }
}
