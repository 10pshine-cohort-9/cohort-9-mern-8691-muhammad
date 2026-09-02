import type { ComponentType } from "react";
import {
  IconUserPlus,
  IconCheck,
  IconClose,
  IconPencil,
} from "@/components/ui/icons";
import type { AppNotification } from "@/lib/api";

interface NotificationPresentation {
  icon: ComponentType<{ size?: number; className?: string }>;
  iconColorClass: string;
  message: string;
  noteId: string;
}

export function presentNotification(
  notification: AppNotification,
): NotificationPresentation {
  switch (notification.type) {
    case "COLLABORATOR_INVITED": {
      const p = notification.payload as Extract<
        AppNotification["payload"],
        { inviterName: string }
      >;
      return {
        icon: IconUserPlus,
        iconColorClass:
          "text-emerald-600 bg-emerald-500/15 dark:text-emerald-400",
        message: `${p.inviterName} invited you to ${p.permission === "WRITE" ? "edit" : "view"} "${p.noteTitle}"`,
        noteId: p.noteId,
      };
    }
    case "PERMISSION_CHANGED": {
      const p = notification.payload as Extract<
        AppNotification["payload"],
        { changedByName: string }
      >;
      return {
        icon: IconCheck,
        iconColorClass: "text-blue-600 bg-blue-500/15 dark:text-blue-400",
        message: `${p.changedByName} changed your access to "${p.noteTitle}" — you can now ${p.permission === "WRITE" ? "edit" : "only view"} it`,
        noteId: p.noteId,
      };
    }
    case "COLLABORATOR_REMOVED": {
      const p = notification.payload as Extract<
        AppNotification["payload"],
        { removedByName: string }
      >;
      return {
        icon: IconClose,
        iconColorClass: "text-destructive bg-destructive/15",
        message: `${p.removedByName} removed your access to "${p.noteTitle}"`,
        noteId: p.noteId,
      };
    }
    case "NOTE_EDITED": {
      const p = notification.payload as Extract<
        AppNotification["payload"],
        { editorName: string }
      >;
      return {
        icon: IconPencil,
        iconColorClass: "text-amber-600 bg-amber-500/15 dark:text-amber-400",
        message: `${p.editorName} edited "${p.noteTitle}"`,
        noteId: p.noteId,
      };
    }
    default: {
      const _exhaustive: never = notification.type;
      throw new Error(`Unhandled notification type: ${_exhaustive}`);
    }
  }
}
