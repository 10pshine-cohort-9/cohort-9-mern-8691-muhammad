"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
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
import { passwordStrength } from "@/lib/utils";
import { type SignUpInput, signUpSchema } from "@/lib/schemas";

export function SignupForm() {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const signUp = useAuthStore((s) => s.signUp);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  useEffect(() => {
    if (isInitialized && !isAuthLoading && user) {
      router.replace("/dashboard");
    }
  }, [isInitialized, isAuthLoading, user, router]);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const passwordValue = useWatch({ control, name: "password" }) || "";
  const strength = passwordStrength(passwordValue);

  const onSubmit = async (data: SignUpInput) => {
    setServerError(null);
    try {
      await signUp({
        name: data.name?.trim() || undefined,
        username: data.username.trim(),
        email: data.email.trim(),
        password: data.password,
      });
      toast.success("Welcome to Memories! Account created successfully.");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  };

  const strengthColors = [
    "bg-destructive",
    "bg-destructive",
    "bg-amber-500",
    "bg-blue-500",
    "bg-emerald-500",
  ];

  return (
    <div>
      <CardHeader className="p-0 mb-6">
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Create Account
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm mt-1">
          Join Memories to organize notes, collaborate, and remember everything.
        </CardDescription>
      </CardHeader>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-3.5"
      >
        <div>
          <Label
            htmlFor="name"
            className="text-xs font-semibold text-foreground"
          >
            Full Name (optional)
          </Label>
          <Input
            id="name"
            placeholder="e.g. User 786"
            {...register("name")}
            autoComplete="name"
            className="mt-1 rounded-xl"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive font-medium">
              {errors.name.message}
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
            placeholder="e.g. user786"
            {...register("username")}
            hasError={!!errors.username}
            autoComplete="username"
            className="mt-1 rounded-xl"
          />
          {errors.username && (
            <p className="mt-1 text-xs text-destructive font-medium">
              {errors.username.message}
            </p>
          )}
        </div>

        <div>
          <Label
            htmlFor="email"
            className="text-xs font-semibold text-foreground"
          >
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="user786@example.com"
            {...register("email")}
            hasError={!!errors.email}
            autoComplete="email"
            className="mt-1 rounded-xl"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive font-medium">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <Label
            htmlFor="password"
            className="text-xs font-semibold text-foreground"
          >
            Password
          </Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              {...register("password")}
              hasError={!!errors.password}
              autoComplete="new-password"
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

          {passwordValue.length > 0 && (
            <div className="mt-2">
              <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full bg-muted">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className={`h-full flex-1 rounded-full ${
                      i < strength.score
                        ? strengthColors[strength.score]
                        : "bg-transparent"
                    }`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: i < strength.score ? 1 : 0 }}
                    style={{ transformOrigin: "left" }}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {strength.label}
              </p>
            </div>
          )}
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
          className="w-full rounded-xl py-2.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all mt-2"
        >
          {isSubmitting && (
            <IconLoader size={18} className="animate-spin mr-2" />
          )}
          {isSubmitting ? "Creating Account…" : "Create Account"}
        </Button>
      </form>

      <div className="mt-5 pt-4 border-t border-border text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-primary hover:underline transition-all"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
