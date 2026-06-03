"use client";
// React Bits — CountUp: animate a number from 0 to target on mount.
import { useEffect, useRef, useState } from "react";
import { animate } from "motion";

export default function CountUp({
  to, duration = 1.2, className, prefix = "", suffix = "",
}: { to: number; duration?: number; className?: string; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const controls = animate(0, to, {
      duration, ease: "easeOut", onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [to, duration]);

  return <span className={className}>{prefix}{val.toLocaleString()}{suffix}</span>;
}
