"use client";

import { useTheme } from "next-themes";
import { Toaster, type ToasterProps } from "sonner";

export function ThemeToaster(props: Readonly<ToasterProps>) {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      position="bottom-right"
      richColors
      theme={
        (resolvedTheme === "dark" ? "dark" : "light") as ToasterProps["theme"]
      }
      {...props}
    />
  );
}
