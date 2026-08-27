"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconLoader } from "@/components/ui/icons";
import { useAuthStore } from "@/lib/store";
import { AuroraBackground } from "@/components/layout/aurora-background";

export default function RootPage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [user, isLoading, router]);

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center bg-background">
      <AuroraBackground />
      <IconLoader
        className="relative z-10 animate-spin text-primary"
        size={32}
      />
    </div>
  );
}
