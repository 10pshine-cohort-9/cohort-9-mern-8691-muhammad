"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { IconEye, IconEyeClosed, IconLoader } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store";
import { ApiError } from "@/lib/api";
import { type LoginInput, loginSchema } from "@/lib/schemas";

export function LoginForm() {
  const login = useAuthStore((s) => s.login);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    try {
      await login(data);
      toast.success("Welcome back to Memories!");
      router.push("/dashboard");
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : "Invalid credentials. Please check your username/email and password.",
      );
    }
  };

  return (
    <div>
      <CardHeader className="p-0 mb-6">
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm mt-1">
          Enter your credentials to access your memories and notes.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <Label
            htmlFor="identifier"
            className="text-xs font-semibold text-foreground"
          >
            Email or Username
          </Label>
          <Input
            id="identifier"
            type="text"
            placeholder="e.g. user786 or user786@example.com"
            autoComplete="username"
            {...register("identifier")}
            hasError={!!errors.identifier}
            className="mt-1 rounded-xl"
          />
          {errors.identifier && (
            <p className="mt-1 text-xs text-destructive font-medium">
              {errors.identifier.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-xs font-semibold text-foreground"
            >
              Password
            </Label>
          </div>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              {...register("password")}
              hasError={!!errors.password}
              className="pr-11 rounded-xl"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <IconEyeClosed size={18} />
              ) : (
                <IconEye size={18} />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-destructive font-medium">
              {errors.password.message}
            </p>
          )}
        </div>

        <AnimatePresence>
          {serverError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert variant="error">{serverError}</Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          disabled={isSubmitting}
          aria-label="Log in"
          className="w-full rounded-xl py-2.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all mt-2"
        >
          {isSubmitting && (
            <IconLoader size={18} className="animate-spin mr-2" />
          )}
          {isSubmitting ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-border text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-bold text-primary hover:underline transition-all"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
