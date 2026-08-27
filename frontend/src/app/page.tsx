import { IconLoader } from "@/components/ui/icons";
import { AuroraBackground } from "@/components/layout/aurora-background";

export default function RootPage() {
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
