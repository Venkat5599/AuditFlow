// Static analyzer engine: slither + aderyn -> normalized Findings.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { AuditTool, Finding, Severity, TargetRepo } from "../types";

const id = (f: Partial<Finding>) =>
  createHash("sha1").update(`${f.file}:${f.lines?.[0]}:${f.title}`).digest("hex").slice(0, 12);

const SLITHER_SEV: Record<string, Severity> = {
  High: "High", Medium: "Medium", Low: "Low", Informational: "QA", Optimization: "Gas",
};

function runSlither(repo: TargetRepo): Finding[] {
  const out = join(repo.localPath, ".auditflow-slither.json");
  const res = spawnSync("slither", [".", "--json", out], {
    cwd: repo.localPath, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 6 * 60_000,
  });
  if (!existsSync(out)) return [];
  let data: any;
  try { data = JSON.parse(readFileSync(out, "utf8")); } catch { return []; }
  const dets = data?.results?.detectors ?? [];
  return dets.map((d: any): Finding => {
    const el = d.elements?.[0]?.source_mapping;
    const file = d.elements?.[0]?.source_mapping?.filename_relative ?? "";
    const ln = el?.lines?.[0] ?? 0;
    return {
      id: id({ file, lines: [ln, ln], title: d.check }),
      severity: SLITHER_SEV[d.impact] ?? "Low",
      title: `${d.check}: ${(d.description ?? "").split("\n")[0].slice(0, 80)}`,
      file, lines: [ln, el?.lines?.slice(-1)[0] ?? ln],
      impact: d.impact ?? "", description: d.description ?? "",
      recommendation: "See Slither detector docs for remediation.",
      tool: "slither", confidence: "high",
    };
  });
}

function runAderyn(repo: TargetRepo): Finding[] {
  const out = join(repo.localPath, ".auditflow-aderyn.json");
  spawnSync("aderyn", [".", "-o", out], {
    cwd: repo.localPath, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 6 * 60_000,
  });
  if (!existsSync(out)) return [];
  let data: any;
  try { data = JSON.parse(readFileSync(out, "utf8")); } catch { return []; }
  const sections = [
    ...(data?.high_issues?.issues ?? []).map((i: any) => ({ i, sev: "High" as Severity })),
    ...(data?.low_issues?.issues ?? []).map((i: any) => ({ i, sev: "Low" as Severity })),
  ];
  return sections.flatMap(({ i, sev }) =>
    (i.instances ?? [{}]).map((inst: any): Finding => {
      const file = inst.contract_path ?? "";
      const ln = inst.line_no ?? 0;
      return {
        id: id({ file, lines: [ln, ln], title: i.title }),
        severity: sev, title: i.title ?? "aderyn issue", file, lines: [ln, ln],
        impact: i.description ?? "", description: i.description ?? "",
        recommendation: "See Aderyn detector docs.", tool: "aderyn", confidence: "high",
      };
    })
  );
}

export function runAnalyzer(tool: AuditTool, repo: TargetRepo): Finding[] {
  try {
    if (tool.command === "slither") return runSlither(repo);
    if (tool.command === "aderyn") return runAderyn(repo);
  } catch { /* analyzer missing or crashed — skip */ }
  return [];
}
