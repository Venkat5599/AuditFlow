"use client";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ThemeSwitch } from "@/components/theme-switch";
import type { ReactNode } from "react";

const Corner = ({ className }: { className: string }) => (
  <svg className={className} width="50" height="50" viewBox="0 0 50 50" fill="none" aria-hidden="true">
    <path d="M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z" fill="currentColor" />
  </svg>
);

// Marketing chrome (frame, corners, header) shows on the landing page only.
// App routes (/dashboard) render full-bleed.
export function SiteChrome(): ReactNode {
  const path = usePathname();
  const isApp = path?.startsWith("/dashboard");
  if (isApp) return <ThemeSwitch />;
  return (
    <>
      <div className="site-frame site-frame--top" aria-hidden="true" />
      <div className="site-frame site-frame--bottom" aria-hidden="true" />
      <div className="site-frame site-frame--left" aria-hidden="true" />
      <div className="site-frame site-frame--right" aria-hidden="true" />
      <Corner className="site-corner site-corner--top-left" />
      <Corner className="site-corner site-corner--top-right" />
      <Corner className="site-corner site-corner--bottom-left" />
      <Corner className="site-corner site-corner--bottom-right" />
      <SiteHeader />
      <ThemeSwitch />
    </>
  );
}
