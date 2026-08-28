import { useEffect } from "react";

interface ShortcutOptions {
  key: string;
  ctrlOrCmd?: boolean;
  onTrigger: (e: KeyboardEvent) => void;
  enabled?: boolean;
}

export function useKeyboardShortcut({
  key,
  ctrlOrCmd = true,
  onTrigger,
  enabled = true,
}: ShortcutOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const modifierPressed = ctrlOrCmd ? e.ctrlKey || e.metaKey : true;
      if (modifierPressed && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        onTrigger(e);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, ctrlOrCmd, onTrigger, enabled]);
}
