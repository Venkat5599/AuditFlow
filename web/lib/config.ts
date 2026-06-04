// AuditFlow site config (template structure, AuditFlow content).

export const siteConfig = {
  name: "AuditFlow",
  tagline: "Audit any Solidity repo. Ship the fixes.",
  description: "Agent-orchestrated Solidity security auditing for Mantle.",
  url: "https://auditflow-theta.vercel.app",
  twitter: "@auditflow",
  nav: {
    cta: { text: "Agent Chat", href: "/chat" },
    signIn: { text: "Run audit", href: "#audit" },
  },
};

export const heroConfig = {
  badge: "Mantle · Turing Test 2026 · Track 05",
  headline: { line1: "Audit any Solidity repo.", line2: "Ship the", accent: "fixes." },
  subheadline:
    "Connect GitHub, paste a repo. AuditFlow routes it through 31 audit tools + Mantle L2 detectors, writes a Code4rena-style report, and opens a validated auto-fix PR.",
  cta: { text: "Run an audit", href: "#audit" },
};

export const blurHeadlineConfig = {
  text: "31 audit tools. Static analyzers and LLM security detectors, orchestrated by signal, deduped, and graded into a Code4rena-style report with validated auto-fix pull requests, tuned for Mantle Solidity code.",
};

export const testimonialsConfig = {
  title: "Built on proven audit methodology",
  autoplayInterval: 10000,
};

export const howItWorksConfig = {
  title: "From repo to PR",
  description: "Connect GitHub, paste a repo, pick the fixes. Clones are deleted the instant the report is built.",
  cta: { text: "Run an audit", href: "#audit" },
};

export const pricingConfig = {
  title: "The arsenal",
  description: "31 audit tools + 7 Mantle detectors + 2 static analyzers, routed by signal — not all at once.",
  billingNote: "Free engine · DeepSeek via OpenCode Zen",
};

export const faqConfig = {
  title: "Everything you need to know",
  description: "Questions about AuditFlow? Reach out.",
  cta: {
    primary: { text: "Run an audit", href: "#audit" },
    secondary: { text: "Agent Chat", href: "/chat" },
  },
};

export const footerConfig = {
  cta: { headline: "Audit your Solidity repo today", placeholder: "owner/repo", button: "Run audit" },
  copyright: `© ${new Date().getFullYear()} AuditFlow · Mantle Turing Test Hackathon. All rights reserved.`,
};

export const features = {
  smoothScroll: true,
  testimonialAutoplay: true,
  parallaxHero: true,
  blurInHeadline: true,
};

export const themeConfig = {
  defaultTheme: "light" as "light" | "dark" | "system",
  enableSystemTheme: false,
};
