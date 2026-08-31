import { type HTMLAttributes } from "react";
import { IconCheck, IconClose } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "error" | "success";
}

export function Alert({
  className,
  variant = "error",
  children,
  ...props
}: Readonly<AlertProps>) {
  const Icon = variant === "error" ? IconClose : IconCheck;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-2xl border px-4 py-3 text-xs sm:text-sm font-medium",
        variant === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        className,
      )}
      {...props}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
