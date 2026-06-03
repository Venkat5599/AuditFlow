// Orchestration spine: clone -> detect -> route -> audit -> report -> PR.
import type { AuditReport, Finding } from "../types";
import { cloneRepo, openFixPR } from "../github/github";
import { findContracts, detectFramework } from "../detect/detect";
import { routeTools } from "../routing/router";
import { runSkill } from "../engine/opencode";
import { runAnalyzer } from "../engine/analyzers";
import { runMantleDetectors } from "../mantle/detectors";
import { attestOnMantle } from "../chain/attest";
import { buildReport } from "../report/report";

export interface RunOptions {
  url: string;
  githubToken?: string;   // for clone (private) + PR
  createPR?: boolean;
  onEvent?: (e: { phase: string; detail: string }) => void;
}

export async function runAudit(opts: RunOptions): Promise<{ report: AuditReport; prUrl?: string }> {
  const hubRoot = process.env.AUDITFLOW_HUB ?? process.cwd();
  const emit = opts.onEvent ?? (() => {});
  const startedAt = new Date().toISOString();

  emit({ phase: "clone", detail: opts.url });
  const repo = cloneRepo(opts.url, opts.githubToken);

  emit({ phase: "detect", detail: repo.localPath });
  repo.contracts = findContracts(repo.localPath);
  repo.framework = detectFramework(repo.localPath);
  if (repo.contracts.length === 0) throw new Error("No Solidity contracts found in repo");

  emit({ phase: "route", detail: `${repo.contracts.length} contracts` });
  const { tools, signals } = routeTools(repo, hubRoot);
  emit({ phase: "route", detail: `signals: ${signals.join(",") || "none"} | tools: ${tools.map((t) => t.id).join(",")}` });

  // Analyzers (sync, deterministic) + skills (async, LLM) in parallel.
  const all: Finding[] = [];
  for (const t of tools.filter((t) => t.kind === "analyzer")) {
    emit({ phase: "analyze", detail: t.id });
    all.push(...runAnalyzer(t, repo));
  }

  // Mantle-specific detectors — always run (Track-05 differentiator).
  emit({ phase: "mantle", detail: "mantle-detectors" });
  all.push(...runMantleDetectors(repo));
  const skillResults = await Promise.all(
    tools.filter((t) => t.kind === "skill").map(async (t) => {
      emit({ phase: "audit", detail: t.id });
      return runSkill(t, repo, hubRoot);
    })
  );
  for (const r of skillResults) all.push(...r);

  emit({ phase: "report", detail: `${all.length} raw findings` });
  const report = buildReport(repo, all, [...tools.map((t) => t.id), "mantle-detectors"], startedAt);

  // On-chain attestation on Mantle (env-gated; no-op without registry+key).
  try {
    const att = await attestOnMantle(report);
    if (att) emit({ phase: "attest", detail: `Mantle tx ${att.txHash}` });
  } catch (e) { emit({ phase: "attest", detail: `skipped: ${(e as Error).message}` }); }

  let prUrl: string | undefined;
  if (opts.createPR && opts.githubToken) {
    emit({ phase: "pr", detail: "opening fix PR" });
    try { prUrl = await openFixPR(repo, report, opts.githubToken); }
    catch (e) { emit({ phase: "pr", detail: `skipped: ${(e as Error).message}` }); }
  }
  emit({ phase: "done", detail: prUrl ?? "report ready" });
  return { report, prUrl };
}
