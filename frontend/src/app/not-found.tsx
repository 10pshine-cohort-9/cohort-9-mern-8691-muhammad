"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { IconArrowLeft, IconNotes } from "@/components/ui/icons";

export default function NotFoundPage(): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="relative mb-6 max-w-md w-full flex justify-center">
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 drop-shadow-2xl">
          <Image
            src="/Error-404.gif"
            alt="404 Page Not Found"
            fill
            className="object-contain"
            priority
            unoptimized
          />
        </div>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-semibold mb-3 border border-destructive/20">
        404 Lost in Memories
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-2">
        Oops! Page Not Found
      </h1>
      <p className="text-muted-foreground max-w-md text-base sm:text-lg mb-8">
        The memory or page you are looking for has either been moved, deleted,
        or never existed in the universe.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all w-full sm:w-auto"
        >
          <IconArrowLeft size={18} />
          <span>Return to Dashboard</span>
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm border border-border hover:bg-muted transition-all w-full sm:w-auto"
        >
          <IconNotes size={18} />
          <span>Browse Notes</span>
        </Link>
      </div>
    </div>
  );
}
