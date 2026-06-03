import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const baseMetadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: { title: siteConfig.name, description: siteConfig.description, url: siteConfig.url, type: "website" },
};
