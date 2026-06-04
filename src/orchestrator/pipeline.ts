// Orchestration spine: clone -> detect -> route -> audit -> report -> PR.
import type { AuditReport, Finding } from "../types";
import { cloneRepo, openFixPR, cleanupClone, sweepTemp } from "../github/github";
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
  ref?: string;           // branch / tag / commit to audit (default branch if absent)
  scopeFiles?: string[];  // manual contract scope — relative .sol paths; empty = agents decide
  createPR?: boolean;
  onEvent?: (e: { phase: string; detail: string }) => void;
}

export async function runAudit(opts: RunOptions): Promise<{ report: AuditReport; prUrl?: string }> {
  const hubRoot = process.env.AUDITFLOW_HUB ?? process.cwd();
  const emit = opts.onEvent ?? (() => {});
  const startedAt = new Date().toISOString();

  sweepTemp(); // clear any stale clones from abandoned runs first
  emit({ phase: "clone", detail: opts.ref ? `${opts.url} @ ${opts.ref}` : opts.url });
  const repo = cloneRepo(opts.url, opts.githubToken, opts.ref);

  emit({ phase: "detect", detail: repo.localPath });
  repo.contracts = findContracts(repo.localPath);
  repo.framework = detectFramework(repo.localPath);
  if (repo.contracts.length === 0) throw new Error("No Solidity contracts found in repo");

  // Manual scope — narrow detected contracts to the user-picked .sol files.
  const scope = opts.scopeFiles?.filter(Boolean) ?? [];
  if (scope.length) {
    const want = new Set(scope.map((p) => p.replace(/^\.?\//, "")));
    const picked = repo.contracts.filter((c) => want.has(c.replace(/^\.?\//, "")));
    if (picked.length) {
      repo.contracts = picked;
      emit({ phase: "scope", detail: `${picked.length} contract(s) selected manually` });
    }
  }

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
  // Concurrency-limited so the free LLM gateway isn't rate-limited (429) when
  // many skills run. AUDITFLOW_CONCURRENCY controls the parallel window.
  const skillTools = tools.filter((t) => t.kind === "skill");
  const limit = Math.max(1, Number(process.env.AUDITFLOW_CONCURRENCY ?? 4));
  let cursor = 0;
  const worker = async () => {
    for (;;) {
      const i = cursor++;
      if (i >= skillTools.length) return;
      const t = skillTools[i];
      emit({ phase: "audit", detail: `${t.id} (${i + 1}/${skillTools.length})` });
      try { all.push(...(await runSkill(t, repo, hubRoot))); }
      catch { /* one skill failing must not kill the audit */ }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, skillTools.length) }, worker));

  emit({ phase: "report", detail: `${all.length} raw findings` });
  const report = buildReport(repo, all, [...tools.map((t) => t.id), "mantle-detectors"], startedAt);

  // Auto-fix diffs are generated lazily at PR time (openFixPR), not here — keeps the
  // audit within the SSE budget and only does the work for findings the user picks.

  // Disk policy: the audit clone is no longer needed — delete it NOW, before the
  // (possibly long) attestation/PR steps and before any triage idle wait.
  cleanupClone(repo.localPath);
  report.repo = { ...report.repo, localPath: "" };

  // On-chain attestation on Mantle (env-gated; no-op without registry+key).
  try {
    const att = await attestOnMantle(report);
    if (att) emit({ phase: "attest", detail: `Mantle tx ${att.txHash}` });
  } catch (e) { emit({ phase: "attest", detail: `skipped: ${(e as Error).message}` }); }

  let prUrl: string | undefined;
  if (opts.createPR && opts.githubToken) {
    emit({ phase: "pr", detail: "opening fix PR" });
    // openFixPR re-clones fresh (transient) — the audit clone is already gone.
    try { prUrl = await openFixPR(report.repo, report, opts.githubToken); }
    catch (e) { emit({ phase: "pr", detail: `skipped: ${(e as Error).message}` }); }
  }
  emit({ phase: "done", detail: prUrl ?? "report ready" });
  return { report, prUrl };
}
