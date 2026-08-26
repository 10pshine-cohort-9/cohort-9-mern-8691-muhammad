export function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-paper dark:bg-ink">
      <div className="aurora-bg" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.02))] dark:bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.35))]" />
    </div>
  );
}
