import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { generateText, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password) && /\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) && password.length >= 12) score++;

  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score] };
}

export function getUserInitials(
  name?: string | null,
  username?: string | null,
): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  if (username?.trim()) {
    return username.trim()[0].toUpperCase();
  }
  return "U";
}

export function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((t) => t.trim().replace(/^#+/, "").toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function getNoteExcerpt(
  content: JSONContent | string,
  maxLength = 160,
): string {
  if (!content) return "";
  let text = "";
  if (typeof content === "object" && content !== null) {
    try {
      text = generateText(content as JSONContent, [StarterKit], {
        blockSeparator: " ",
      });
    } catch {
      text = "";
    }
  } else if (typeof content === "string") {
    text = content;
  }
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > maxLength
    ? `${clean.slice(0, maxLength).trim()}…`
    : clean;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
