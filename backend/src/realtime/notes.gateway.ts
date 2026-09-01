import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Server, Socket } from 'socket.io';
import { TokenService } from '../token/token.service.js';
import { NotesService } from '../notes/notes.service.js';
import type { Note } from '../generated/prisma/client.js';
import type { NoteResponse } from '../notes/notes.types.js';
import type { NotificationResponse } from '../notifications/notifications.types.js';
import { AUTH_COOKIE_NAMES } from '../common/utils/cookies.util.js';

// This userId is the way of verification of our socket point
interface AuthenticatedSocketData {
  userId: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class NotesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly tokenService: TokenService,
    private readonly notesService: NotesService,
    @InjectPinoLogger(NotesGateway.name) private readonly logger: PinoLogger,
  ) {}

  // This is our middleware which authenticates our socket requests
  afterInit(server: Server): void {
    server.use(async (socket, next) => {
      const token = this.extractToken(socket);
      if (!token) {
        this.logger.warn(
          { socketId: socket.id },
          'Socket handshake rejected: no token',
        );
        return next(new Error('Unauthorized: missing token'));
      }

      try {
        const payload = await this.tokenService.verifyAccessToken(token);
        (socket.data as AuthenticatedSocketData).userId = payload.sub;
        return next();
      } catch {
        this.logger.warn(
          { socketId: socket.id },
          'Socket handshake rejected: invalid token',
        );
        return next(new Error('Unauthorized: invalid token'));
      }
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    let userId = (client.data as AuthenticatedSocketData | undefined)?.userId;
    if (!userId) {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(
          { socketId: client.id },
          'Socket connection rejected: no token',
        );
        client.disconnect(true);
        return;
      }

      try {
        const payload = await this.tokenService.verifyAccessToken(token);
        userId = payload.sub;
        (client.data as AuthenticatedSocketData).userId = userId;
      } catch {
        this.logger.warn(
          { socketId: client.id },
          'Socket connection rejected: invalid token',
        );
        client.disconnect(true);
        return;
      }
    }

    await client.join(`user:${userId}`);
    this.logger.info({ socketId: client.id, userId }, 'Socket connected');
  }

  handleDisconnect(client: Socket): void {
    const userId = (client.data as AuthenticatedSocketData | undefined)?.userId;
    this.logger.info({ socketId: client.id, userId }, 'Socket disconnected');
  }

  @SubscribeMessage('auth:refresh')
  async handleAuthRefresh(
    client: Socket,
    payload: { token?: string },
  ): Promise<{ ok: boolean }> {
    const token = payload?.token || this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return { ok: false };
    }
    try {
      const verified = await this.tokenService.verifyAccessToken(token);
      (client.data as AuthenticatedSocketData).userId = verified.sub;
      return { ok: true };
    } catch {
      this.logger.warn(
        { socketId: client.id },
        'Socket auth:refresh failed: invalid or expired token',
      );
      client.disconnect(true);
      return { ok: false };
    }
  }

  @SubscribeMessage('note:join')
  async handleNoteJoin(
    client: Socket,
    noteId: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const token = this.extractToken(client);
    if (token) {
      try {
        const payload = await this.tokenService.verifyAccessToken(token);
        (client.data as AuthenticatedSocketData).userId = payload.sub;
      } catch {
        this.logger.warn(
          { socketId: client.id },
          'Socket note:join rejected: access token expired',
        );
        client.disconnect(true);
        return { ok: false, error: 'Session expired' };
      }
    }
    const userId = (client.data as AuthenticatedSocketData).userId;
    try {
      await this.notesService.findOne(userId, noteId);
      await client.join(`note:${noteId}`);
      return { ok: true };
    } catch {
      this.logger.warn(
        { userId, noteId },
        'Socket note:join denied - no access',
      );
      return { ok: false, error: 'You do not have access to this note' };
    }
  }

  @SubscribeMessage('note:leave')
  async handleNoteLeave(
    client: Socket,
    noteId: string,
  ): Promise<{ ok: boolean }> {
    await client.leave(`note:${noteId}`);
    return { ok: true };
  }

  emitNoteUpdated(note: NoteResponse | Note, editedByUserId: string): void {
    this.server
      .to(`note:${note.id}`)
      .emit('note:updated', { note, editedByUserId });
  }

  emitNoteDeleted(noteId: string, deletedByUserId: string): void {
    this.server
      .to(`note:${noteId}`)
      .emit('note:deleted', { noteId, deletedByUserId });
  }

  emitNotification(
    userId: string,
    notification: NotificationResponse | Record<string, unknown>,
  ): void {
    this.server.to(`user:${userId}`).emit('notification:new', { notification });
  }

  evictUserFromNoteRoom(userId: string, noteId: string): void {
    const roomSockets = this.server.sockets.adapter.rooms.get(`user:${userId}`);
    if (roomSockets) {
      for (const socketId of roomSockets) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          void socket.leave(`note:${noteId}`);
          socket.emit('note:access-revoked', { noteId });
        }
      }
    }
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      const match = new RegExp(
        new RegExp(String.raw`(?:^|;\s*)${AUTH_COOKIE_NAMES.ACCESS}=([^;]+)`),
      ).exec(cookieHeader);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    return undefined;
  }
}
