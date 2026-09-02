"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader, IconLogout, IconUserCircle } from "@/components/ui/icons";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { useAuthStore } from "@/lib/store";
import { ApiError, authApi } from "@/lib/api";
import { getUserInitials } from "@/lib/utils";
import { toast } from "sonner";
import {
  type ChangePasswordInput,
  changePasswordSchema,
  type UpdateProfileInput,
  updateProfileSchema,
} from "@/lib/schemas";

function ProfileContent(): React.ReactElement | null {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const logout = useAuthStore((s) => s.logout);
  const logoutAll = useAuthStore((s) => s.logoutAll);
  const refreshUser = useAuthStore((s) => s.fetchUser);
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [isInitialized, isAuthLoading, user, router]);

  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: {
      name: user?.name ?? "",
      username: user?.username ?? "",
    },
    mode: "onBlur",
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isChangingPassword },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
    mode: "onBlur",
  });

  if (!user) return null;

  const onProfileSubmit = async (data: UpdateProfileInput) => {
    setProfileError(null);
    setProfileSuccess(false);
    try {
      await authApi.updateProfile({
        name: data.name?.trim() || undefined,
        username: data.username?.trim(),
      });
      await refreshUser();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(
        err instanceof ApiError
          ? err.message
          : "Could not update profile. Please try again.",
      );
    }
  };

  const onPasswordSubmit = async (data: ChangePasswordInput) => {
    setPasswordError(null);
    setPasswordSuccess(false);
    try {
      await authApi.changePassword(data);
      setPasswordSuccess(true);
      resetPasswordForm();
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(
        err instanceof ApiError
          ? err.message
          : "Could not change password. Please try again.",
      );
    }
  };

  const displayName = user.name || `@${user.username}`;
  const avatarChar = getUserInitials(user.name, user.username);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto mt-6 max-w-3xl px-4 sm:px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="neo-card p-6 sm:p-8 border border-border bg-card shadow-sm rounded-3xl">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-2xl font-black text-white shadow-lg shadow-emerald-500/20">
                  {avatarChar || <IconUserCircle size={28} />}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {displayName}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    @{user.username} • {user.email}
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleProfileSubmit(onProfileSubmit)}
                noValidate
                className="space-y-4"
              >
                <div>
                  <Label
                    htmlFor="name"
                    className="text-xs font-semibold text-foreground"
                  >
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    {...registerProfile("name")}
                    hasError={!!profileErrors.name}
                    className="mt-1 rounded-xl bg-secondary/50"
                    placeholder="e.g. User 786"
                  />
                  {profileErrors.name && (
                    <p className="mt-1 text-xs text-destructive font-medium">
                      {profileErrors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="username"
                    className="text-xs font-semibold text-foreground"
                  >
                    Username
                  </Label>
                  <Input
                    id="username"
                    {...registerProfile("username")}
                    hasError={!!profileErrors.username}
                    className="mt-1 rounded-xl bg-secondary/50"
                  />
                  {profileErrors.username && (
                    <p className="mt-1 text-xs text-destructive font-medium">
                      {profileErrors.username.message}
                    </p>
                  )}
                </div>

                <AnimatePresence>
                  {profileError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Alert variant="error">{profileError}</Alert>
                    </motion.div>
                  )}
                  {profileSuccess && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Alert variant="success">
                        Profile updated successfully.
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  disabled={isSubmittingProfile}
                  className="w-full rounded-xl bg-primary text-primary-foreground"
                >
                  {isSubmittingProfile && (
                    <IconLoader size={18} className="animate-spin mr-1.5" />
                  )}
                  {isSubmittingProfile
                    ? "Saving changes…"
                    : "Save profile changes"}
                </Button>
              </form>
            </div>

            <div className="neo-card p-6 sm:p-8 border border-border bg-card shadow-sm rounded-3xl">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-foreground">
                  Security & Password
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update your account password safely
                </p>
              </div>

              <form
                onSubmit={handlePasswordSubmit(onPasswordSubmit)}
                noValidate
                className="space-y-4"
              >
                <div>
                  <Label
                    htmlFor="currentPassword"
                    className="text-xs font-semibold text-foreground"
                  >
                    Current Password
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...registerPassword("currentPassword")}
                    hasError={!!passwordErrors.currentPassword}
                    className="mt-1 rounded-xl bg-secondary/50"
                  />
                  {passwordErrors.currentPassword && (
                    <p className="mt-1 text-xs text-destructive font-medium">
                      {passwordErrors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="newPassword"
                    className="text-xs font-semibold text-foreground"
                  >
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...registerPassword("newPassword")}
                    hasError={!!passwordErrors.newPassword}
                    className="mt-1 rounded-xl bg-secondary/50"
                    placeholder="At least 8 characters with upper, lower, and number"
                  />
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-xs text-destructive font-medium">
                      {passwordErrors.newPassword.message}
                    </p>
                  )}
                </div>

                <AnimatePresence>
                  {passwordError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Alert variant="error">{passwordError}</Alert>
                    </motion.div>
                  )}
                  {passwordSuccess && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Alert variant="success">
                        Password updated successfully.
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full rounded-xl bg-primary text-primary-foreground"
                >
                  {isChangingPassword && (
                    <IconLoader size={18} className="animate-spin mr-1.5" />
                  )}
                  {isChangingPassword
                    ? "Updating password…"
                    : "Update password"}
                </Button>
              </form>
            </div>
          </div>

          <div className="neo-card p-6 sm:p-8 mt-6 border border-border bg-card shadow-sm rounded-3xl">
            <h2 className="text-lg font-bold text-foreground mb-1">
              Session Management
            </h2>
            <p className="text-xs text-muted-foreground mb-5">
              Manage active sessions across your devices
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  try {
                    await logout();
                  } catch (err) {
                    toast.error(
                      err instanceof ApiError
                        ? err.message
                        : "Failed to log out. Please try again.",
                    );
                  }
                }}
                className="flex-1 rounded-xl"
              >
                <IconLogout size={18} className="mr-1.5" />
                Log out (This Device)
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={loggingOutAll}
                onClick={async () => {
                  setLoggingOutAll(true);
                  try {
                    await logoutAll();
                  } catch (err) {
                    toast.error(
                      err instanceof ApiError
                        ? err.message
                        : "Failed to log out of all devices.",
                    );
                  } finally {
                    setLoggingOutAll(false);
                  }
                }}
                className="flex-1 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
              >
                {loggingOutAll && (
                  <IconLoader size={18} className="animate-spin mr-1.5" />
                )}
                <IconLogout size={18} className="mr-1.5" />
                Log out all devices
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default function ProfilePage(): React.ReactElement {
  return <ProfileContent />;
}
