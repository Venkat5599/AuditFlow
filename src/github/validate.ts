// Validate a finding's suggestedDiff before it goes into a PR.
// 1) `git apply --check` (does it apply cleanly?)
// 2) compile gate (foundry `forge build` / hardhat `compile`) if available.
// Runs on a throwaway copy so the real clone is never dirtied by rejects.
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Finding, TargetRepo } from "../types";

export interface ValidationResult {
  finding: Finding;
  applies: boolean;
  compiles: boolean | null; // null = no compiler available / skipped
  reason: string;
}

function compileCmd(framework: TargetRepo["framework"]): [string, string[]] | null {
  if (framework === "foundry") return ["forge", ["build", "--no-cache"]];
  if (framework === "hardhat") return ["npx", ["hardhat", "compile"]];
  return null; // truffle/raw/unknown — skip compile gate
}

export function validateDiffs(repo: TargetRepo, findings: Finding[]): ValidationResult[] {
  const withDiffs = findings.filter((f) => f.suggestedDiff?.trim());
  const results: ValidationResult[] = [];
  const cc = compileCmd(repo.framework);

  for (const f of withDiffs) {
    // Apply-check against the live clone (no mutation with --check).
    const patch = join(repo.localPath, ".auditflow-validate.patch");
    writeFileSync(patch, f.suggestedDiff!.endsWith("\n") ? f.suggestedDiff! : f.suggestedDiff! + "\n");
    const check = spawnSync("git", ["apply", "--check", patch], { cwd: repo.localPath, encoding: "utf8" });
    if (check.status !== 0) {
      results.push({ finding: f, applies: false, compiles: null, reason: `git apply --check failed: ${check.stderr.trim().slice(0, 120)}` });
      continue;
    }
    if (!cc) {
      results.push({ finding: f, applies: true, compiles: null, reason: "applies; no compiler to gate" });
      continue;
    }
    // Compile gate on an isolated copy so a bad fix never blocks others.
    const sandbox = mkdtempSync(join(tmpdir(), "af-validate-"));
    try {
      cpSync(repo.localPath, sandbox, { recursive: true });
      writeFileSync(join(sandbox, ".p.patch"), f.suggestedDiff!);
      spawnSync("git", ["apply", "--whitespace=fix", ".p.patch"], { cwd: sandbox, encoding: "utf8" });
      const build = spawnSync(cc[0], cc[1], { cwd: sandbox, encoding: "utf8", timeout: 5 * 60_000 });
      const ok = build.status === 0;
      results.push({ finding: f, applies: true, compiles: ok, reason: ok ? "applies + compiles" : `compile failed: ${(build.stderr || build.stdout).trim().slice(-160)}` });
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  }
  return results;
}

// Diffs safe to include in a PR: must apply, and must compile if a compiler exists.
export function safeDiffs(results: ValidationResult[]): Finding[] {
  return results.filter((r) => r.applies && r.compiles !== false).map((r) => r.finding);
}
