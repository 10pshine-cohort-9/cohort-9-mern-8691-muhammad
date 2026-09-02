"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconUserPlus,
  IconLoader,
  IconTrash,
  IconUsers,
  IconUserCircle,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import {
  notesApi,
  authApi,
  ApiError,
  type Note,
  type Collaborator,
  type CollaboratorPermission,
  type UserListItem,
} from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import {
  type InviteCollaboratorInput,
  inviteCollaboratorSchema,
} from "@/lib/schemas";

interface ShareModalProps {
  open: boolean;
  note: Note | null;
  onClose: () => void;
}

export function ShareModal({ open, note, onClose }: Readonly<ShareModalProps>) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors: formErrors, isSubmitting },
  } = useForm<InviteCollaboratorInput>({
    resolver: zodResolver(inviteCollaboratorSchema),
    defaultValues: {
      identifier: "",
      permission: "READ",
    },
    mode: "onSubmit",
  });

  const identifierValue = useWatch({ control, name: "identifier" }) || "";

  const loadCollaborators = useCallback(async (noteId: string) => {
    setLoadingCollaborators(true);

    try {
      const list = await notesApi.listCollaborators(noteId);
      setCollaborators(Array.isArray(list) ? list : []);
    } catch {
      setError("Could not load collaborators.");
    } finally {
      setLoadingCollaborators(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      if (typeof authApi?.listUsers === "function") {
        const users = await authApi.listUsers();

        if (Array.isArray(users)) {
          setAvailableUsers(users);
        }
      }
    } catch {
      // Non-blocking fallback in testing or offline
    }
  }, []);

  useEffect(() => {
    if (open && note) {
      setError(null);
      reset({ identifier: "", permission: "READ" });
      loadCollaborators(note.id);
      loadUsers();
    }
  }, [open, note, loadCollaborators, loadUsers, reset]);

  const filteredUsers = useMemo(() => {
    const q = identifierValue.replace(/^@/, "").trim().toLowerCase();

    if (!q) return [];

    const collabUserIds = new Set(
      collaborators.map((c) => c.user?.id || c.userId),
    );

    return availableUsers
      .filter((u) => !collabUserIds.has(u.id))
      .filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.name?.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [identifierValue, availableUsers, collaborators]);

  if (!note) return null;

  const onInviteSubmit = async (data: InviteCollaboratorInput) => {
    setError(null);
    setShowSuggestions(false);

    try {
      const collaborator = await notesApi.inviteCollaborator(note.id, data);

      setCollaborators((prev) => [...prev, collaborator]);
      reset({ identifier: "", permission: "READ" });
      toast.success("Collaborator invited successfully");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not send the invite. Ensure the username or email is registered.",
      );
    }
  };

  const handlePermissionChange = async (
    userId: string,
    next: CollaboratorPermission,
  ) => {
    setCollaborators((prev) =>
      prev.map((c) =>
        (c.user?.id || c.userId) === userId ? { ...c, permission: next } : c,
      ),
    );

    try {
      await notesApi.updateCollaborator(note.id, userId, next);
      toast.success("Permission updated");
    } catch (err) {
      loadCollaborators(note.id);

      toast.error(
        err instanceof ApiError
          ? err.message
          : "Could not update collaborator permission.",
      );
    }
  };

  const handleRemove = async (userId: string) => {
    setCollaborators((prev) =>
      prev.filter((c) => (c.user?.id || c.userId) !== userId),
    );

    try {
      await notesApi.removeCollaborator(note.id, userId);
      toast.success("Collaborator removed");
    } catch (err) {
      loadCollaborators(note.id);

      toast.error(
        err instanceof ApiError
          ? err.message
          : "Could not remove collaborator.",
      );
    }
  };

  let collaboratorsContent;

  if (loadingCollaborators) {
    collaboratorsContent = (
      <div className="flex justify-center py-6">
        <IconLoader size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  } else if (collaborators.length === 0) {
    collaboratorsContent = (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        No one else has access yet.
      </div>
    );
  } else {
    collaboratorsContent = (
      <ul className="space-y-2">
        <AnimatePresence>
          {collaborators.map((c) => {
            const targetUserId = c.user?.id || c.userId;
            const targetUsername = c.user?.username || "user";
            const targetName = c.user?.name;

            return (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8, height: 0 }}
                className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-3.5 py-2.5"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <IconUserCircle size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground sm:text-sm">
                      @{targetUsername}
                    </p>

                    {targetName ? (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {targetName}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <select
                    aria-label={`Permission for @${targetUsername}`}
                    value={c.permission}
                    onChange={(e) =>
                      handlePermissionChange(
                        targetUserId,
                        e.target.value as CollaboratorPermission,
                      )
                    }
                    className="h-7 rounded-lg border border-border bg-card px-2 text-[11px] font-semibold text-foreground outline-none"
                  >
                    <option value="READ">Can view</option>
                    <option value="WRITE">Can edit</option>
                  </select>

                  <button
                    type="button"
                    aria-label={`Remove @${targetUsername}`}
                    title="Remove collaborator"
                    onClick={() => handleRemove(targetUserId)}
                    className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      zIndex={60}
      title="Share note"
      className="flex max-h-[85vh] w-full max-w-md flex-col"
    >
      <div className="mb-4 border-b border-border pb-3">
        <p className="line-clamp-1 text-xs font-medium text-muted-foreground">
          {note.title || "Untitled Note"}
        </p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-1 py-1">
        <div>
          <label
            htmlFor="collaborator-identifier"
            className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Invite Collaborator
          </label>

          <form
            onSubmit={handleSubmit(onInviteSubmit)}
            noValidate
            className="relative flex gap-2"
          >
            <div className="relative flex-1">
              <IconUsers
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />

              <Input
                id="collaborator-identifier"
                type="text"
                {...register("identifier")}
                onChange={(e) => {
                  setValue("identifier", e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Type @username or email"
                className="h-10 rounded-xl pl-9 text-sm"
                aria-label="Collaborator email or username"
              />

              {showSuggestions && filteredUsers.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-xl">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setValue("identifier", u.username);
                        setShowSuggestions(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <IconUserCircle size={16} className="text-primary" />

                        <div>
                          <span className="font-semibold text-foreground">
                            @{u.username}
                          </span>

                          {u.name && (
                            <span className="ml-1.5 text-muted-foreground">
                              ({u.name})
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <select
              aria-label="Permission level"
              {...register("permission")}
              className="h-10 rounded-xl border border-border bg-secondary px-2 text-xs font-semibold text-foreground outline-none"
            >
              <option value="READ">Can view</option>
              <option value="WRITE">Can edit</option>
            </select>

            <Button
              type="submit"
              size="icon"
              disabled={isSubmitting || !identifierValue.trim()}
              aria-label="Send invite"
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground"
            >
              {isSubmitting ? (
                <IconLoader size={16} className="animate-spin" />
              ) : (
                <IconUserPlus size={16} />
              )}
            </Button>
          </form>

          {formErrors.identifier && (
            <p className="mt-1 text-xs font-medium text-destructive">
              {formErrors.identifier.message}
            </p>
          )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert variant="error">{error}</Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <p className="mb-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Collaborators</span>

            <span className="font-mono text-[11px] font-semibold text-primary">
              {collaborators.length}
            </span>
          </p>

          {collaboratorsContent}
        </div>
      </div>
    </Modal>
  );
}
