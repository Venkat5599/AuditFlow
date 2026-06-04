// Validate a finding's suggestedDiff before it goes into a PR.
// 1) does it apply? (robust cascade — see patch.ts)
// 2) compile gate (foundry/hardhat) — but ONLY if the repo compiles at baseline,
//    otherwise a pre-existing build break would reject every otherwise-good fix.
// Runs the compile gate on a throwaway copy so the real clone is never dirtied.
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Finding, TargetRepo } from "../types";
import { applyPatch } from "./patch";

export interface ValidationResult {
  finding: Finding;
  applies: boolean;
  compiles: boolean | null; // null = no/!baseline compiler — gate skipped
  reason: string;
}

function compileCmd(framework: TargetRepo["framework"]): [string, string[]] | null {
  if (framework === "foundry") return ["forge", ["build", "--no-cache"]];
  if (framework === "hardhat") return ["npx", ["hardhat", "compile"]];
  return null; // truffle/raw/unknown — skip compile gate
}

// True if the unmodified repo compiles. If it doesn't (missing deps, shallow
// submodules, pre-existing breakage), the compile gate is meaningless and skipped.
function baselineCompiles(repo: TargetRepo, cc: [string, string[]]): boolean {
  const sandbox = mkdtempSync(join(tmpdir(), "af-baseline-"));
  try {
    cpSync(repo.localPath, sandbox, { recursive: true });
    return spawnSync(cc[0], cc[1], { cwd: sandbox, encoding: "utf8", timeout: 5 * 60_000 }).status === 0;
  } catch {
    return false;
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

export function validateDiffs(repo: TargetRepo, findings: Finding[]): ValidationResult[] {
  const withDiffs = findings.filter((f) => f.suggestedDiff?.trim());
  const results: ValidationResult[] = [];
  const cc = compileCmd(repo.framework);
  const gateCompile = cc ? baselineCompiles(repo, cc) : false;

  for (const f of withDiffs) {
    // Apply-check against the live clone (robust; --check never mutates).
    const applies = applyPatch(repo.localPath, f.suggestedDiff!, { check: true, file: f.file });
    if (!applies) {
      results.push({ finding: f, applies: false, compiles: null, reason: "diff does not apply (even with fuzz)" });
      continue;
    }
    if (!cc || !gateCompile) {
      results.push({ finding: f, applies: true, compiles: null, reason: cc ? "applies; baseline build broken — compile gate skipped" : "applies; no compiler to gate" });
      continue;
    }
    // Compile gate on an isolated copy so a bad fix never blocks others.
    const sandbox = mkdtempSync(join(tmpdir(), "af-validate-"));
    try {
      cpSync(repo.localPath, sandbox, { recursive: true });
      applyPatch(sandbox, f.suggestedDiff!, { check: false, file: f.file });
      const build = spawnSync(cc[0], cc[1], { cwd: sandbox, encoding: "utf8", timeout: 5 * 60_000 });
      const ok = build.status === 0;
      results.push({ finding: f, applies: true, compiles: ok, reason: ok ? "applies + compiles" : `compile failed: ${(build.stderr || build.stdout).trim().slice(-160)}` });
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  }
  return results;
}

// Diffs safe to include in a PR: must apply, and must compile if the gate is active.
export function safeDiffs(results: ValidationResult[]): Finding[] {
  return results.filter((r) => r.applies && r.compiles !== false).map((r) => r.finding);
}
