// Central AuditFlow site config (template-driven).
export const siteConfig = {
  name: "AuditFlow",
  tagline: "Audit any Solidity repo. Ship the fixes.",
  description: "Agent-orchestrated Solidity security auditing for Mantle — 31 audit skills, C4-style report, validated auto-PR.",
  url: "https://auditflow-theta.vercel.app",
};

export const features = {
  smoothScroll: true,
};

export const heroConfig = {
  badge: "Mantle · Turing Test 2026 · Track 05",
  headline: { line1: "Audit any Solidity repo.", line2: "Ship the", accent: "fixes." },
  subheadline:
    "Connect GitHub, paste a repo. AuditFlow routes it through 31 audit skills + Mantle L2 detectors, writes a Code4rena-style report, and opens a validated auto-fix PR.",
};
