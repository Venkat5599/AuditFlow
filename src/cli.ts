#!/usr/bin/env bun
// AuditFlow CLI: `bun src/cli.ts <github-url> [--pr]`
import { writeFileSync } from "node:fs";
import { runAudit } from "./orchestrator/pipeline";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
const createPR = args.includes("--pr");

if (!url) {
  console.error("usage: bun src/cli.ts <github-url> [--pr]");
  process.exit(1);
}

const { report, prUrl } = await runAudit({
  url,
  githubToken: process.env.GITHUB_TOKEN,
  createPR,
  onEvent: (e) => console.error(`[${e.phase}] ${e.detail}`),
});

writeFileSync("auditflow-report.md", report.markdown);
console.error(`\n✅ ${report.findings.length} findings | report -> auditflow-report.md`);
if (prUrl) console.error(`🔀 PR: ${prUrl}`);
