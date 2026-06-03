"use client";
// React Bits — GradientText: animated gradient-filled text.
import { cn } from "../../lib/cn";

export default function GradientText({
  children, className,
}: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn("bg-clip-text text-transparent", className)}
      style={{
        backgroundImage: "linear-gradient(90deg, #5eead4, #818cf8, #f472b6, #5eead4)",
        backgroundSize: "300% auto",
        animation: "gradient-x 6s linear infinite",
      }}
    >
      {children}
    </span>
  );
}
