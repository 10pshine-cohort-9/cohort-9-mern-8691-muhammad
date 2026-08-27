"use client";

import { type ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { ThemeToggle } from "../theme/theme-toggle";
import { IconSparkles, IconCheck } from "../ui/icons";

interface AuthShellProps {
  children: ReactNode;
  mode?: "login" | "signup";
}

// We created two side shell based style, left side detailing our App highlights and right side with authentication forms
export function AuthShell({ children, mode: _mode }: Readonly<AuthShellProps>) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:grid lg:grid-cols-12 bg-background relative overflow-hidden">
      <div className="absolute right-4 top-4 z-40">
        <ThemeToggle />
      </div>

      {/* Left App Showcase Panel */}
      <div className="relative lg:col-span-5 xl:col-span-5 bg-linear-to-br from-blue-950/20 via-background to-indigo-950/20 dark:from-blue-950/40 dark:via-background dark:to-slate-950/50 border-b lg:border-b-0 lg:border-r border-border flex flex-col justify-between p-8 sm:p-12 lg:p-14 z-10">
        {/* Shadcn based Background Geometric Visual Accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25 dark:opacity-15">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-sky-500/15 blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link href="/dashboard" className="inline-flex items-center group">
            <div className="flex items-center text-3xl font-black tracking-tight select-none group-hover:opacity-90 transition-opacity">
              <span className="brand-title-mem">MEM</span>
              <span className="brand-title-ories">ORIES</span>
            </div>
          </Link>

          <div className="mt-8 lg:mt-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-500/20 mb-4">
              <IconSparkles size={14} className="text-blue-500" />
              <span>Instant Access to your memory</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight leading-snug">
              Write anything and anywhere, <br />
              <span className="text-blue-600 dark:text-blue-400">
                Never forget what you need to know.
              </span>
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base leading-relaxed">
              Memories is a place to hold your memory for you.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-4 text-xs text-muted-foreground flex items-center justify-between">
          <span>Muhammad Hamza &copy; {new Date().getFullYear()} Memories</span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <IconCheck size={14} /> End-to-End Secure
          </span>
        </div>
      </div>

      {/* Right Auth Forms Panel */}
      <div className="lg:col-span-7 xl:col-span-7 flex items-center justify-center p-6 sm:p-10 lg:p-16 relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="neo-card bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-xl">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
