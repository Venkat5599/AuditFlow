"use client";
// React Bits — Aurora: animated multi-stop gradient backdrop.
import { cn } from "../../lib/cn";

export default function Aurora({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div
        className="absolute -top-1/2 left-1/2 h-[120vh] w-[140vw] -translate-x-1/2 opacity-50 blur-3xl"
        style={{
          background:
            "linear-gradient(115deg, #5eead4, #818cf8, #f472b6, #5eead4)",
          backgroundSize: "300% 300%",
          animation: "aurora 18s ease infinite",
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 0%, black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 0%, black 30%, transparent 70%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,transparent,var(--color-bg)_75%)]" />
    </div>
  );
}
