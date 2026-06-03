"use client";
// React Bits — ShinyText: sweeping highlight across muted text.
import { cn } from "../../lib/cn";

export default function ShinyText({
  text, className,
}: { text: string; className?: string }) {
  return (
    <span
      className={cn("bg-clip-text text-transparent", className)}
      style={{
        backgroundImage:
          "linear-gradient(120deg, rgba(231,234,243,0.45) 40%, #fff 50%, rgba(231,234,243,0.45) 60%)",
        backgroundSize: "200% auto",
        animation: "shine 4s linear infinite",
      }}
    >
      {text}
    </span>
  );
}
