import { Module } from '@nestjs/common';
import { NotesModule } from '../notes/notes.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { NotesGateway } from './notes.gateway.js';
import { RealtimeEventsListener } from './realtime-events.listener.js';

@Module({
  imports: [NotesModule, NotificationsModule],
  providers: [NotesGateway, RealtimeEventsListener],
  exports: [NotesGateway],
})
export class RealtimeModule {}
