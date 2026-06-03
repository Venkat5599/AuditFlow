import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SkipToContent } from "@/components/skip-to-content";
import { ThemeSwitch } from "@/components/theme-switch";
import { baseMetadata } from "@/lib/metadata";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = baseMetadata;
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width", initialScale: 1, maximumScale: 5,
};

const Corner = ({ className }: { className: string }) => (
  <svg className={className} width="50" height="50" viewBox="0 0 50 50" fill="none" aria-hidden="true">
    <path d="M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z" fill="currentColor" />
  </svg>
);

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}>
        <Providers>
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
          <SkipToContent />
          {children}
        </Providers>
      </body>
    </html>
  );
}
