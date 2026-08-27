import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn("rounded-2xl p-8", className)} {...props} />;
}

export function CardHeader({
  className,
  ...props
}: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn("mb-6 space-y-1.5", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: Readonly<HTMLAttributes<HTMLHeadingElement>>) {
  return (
    <h2
      className={cn(
        "font-display text-2xl font-bold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: Readonly<HTMLAttributes<HTMLParagraphElement>>) {
  return (
    <p
      className={cn("text-sm text-ink/60 dark:text-paper/60", className)}
      {...props}
    />
  );
}
