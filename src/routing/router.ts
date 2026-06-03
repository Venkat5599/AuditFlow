// Relevance router: pick which tools to run for a given target repo.
// Keeps the run cheap — never runs all skills, only relevant ones.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AuditTool, TargetRepo } from "../types";
import { REGISTRY } from "./registry";

// Signals scraped from contract source that bump certain tool focuses.
const SIGNAL_PATTERNS: Record<string, RegExp> = {
  reentrancy: /\.call\{|\.transfer\(|\.send\(|nonReentrant/i,
  "access-control": /onlyOwner|AccessControl|hasRole|msg\.sender ==/i,
  accounting: /totalSupply|balanceOf|reserves|shares|mint\(|burn\(/i,
  oracle: /latestAnswer|getPrice|oracle|chainlink/i,
  proxy: /delegatecall|upgradeTo|__gap|initializer/i,
};

export interface RoutingResult {
  tools: AuditTool[];
  signals: string[];
  reason: Record<string, string>;
}

export function routeTools(repo: TargetRepo, hubRoot: string): RoutingResult {
  // Sample contract bodies (cap to keep it fast).
  const blob = repo.contracts.slice(0, 50)
    .map((c) => { try { return readFileSync(join(repo.localPath, c), "utf8"); } catch { return ""; } })
    .join("\n");

  const signals = Object.entries(SIGNAL_PATTERNS)
    .filter(([, re]) => re.test(blob))
    .map(([k]) => k);

  const reason: Record<string, string> = {};
  const scored = REGISTRY
    .filter((t) => t.langs.includes("solidity"))
    .map((t) => {
      const overlap = t.focus.filter((f) => signals.includes(f)).length;
      const score = t.weight + overlap * 0.5;
      reason[t.id] = `weight ${t.weight} + ${overlap} signal-match`;
      return { t, score };
    })
    .sort((a, b) => b.score - a.score);

  // Always keep both analyzers (deterministic baseline) + top skills.
  const analyzers = scored.filter((s) => s.t.kind === "analyzer").map((s) => s.t);
  const skills = scored.filter((s) => s.t.kind === "skill").slice(0, 4).map((s) => s.t);

  return { tools: [...analyzers, ...skills], signals, reason };
}
