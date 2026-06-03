// Curated Solidity/EVM tool registry.
//   - pashov solidity-auditor agents (bundled, primary)
//   - external audit skills vendored from the hub (qs_skills, nemesis, forefy, ...)
//   - static analyzers (slither, aderyn)
// External skills load from skills/external/_manifest.txt so adding a skill is just
// re-running scripts/vendor-skills.sh — no code change.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AuditTool } from "../types";

const PASHOV: AuditTool[] = [
  { id: "pashov-vector-scan",      kind: "skill", langs: ["solidity"], focus: ["logic","reentrancy","access-control","accounting"], promptPath: "skills/pashov/vector-scan.md",      weight: 1.0 },
  { id: "pashov-access-control",   kind: "skill", langs: ["solidity"], focus: ["access-control","proxy"],                           promptPath: "skills/pashov/access-control.md",   weight: 0.95 },
  { id: "pashov-math-precision",   kind: "skill", langs: ["solidity"], focus: ["accounting","math","oracle"],                       promptPath: "skills/pashov/math-precision.md",   weight: 0.95 },
  { id: "pashov-economic-security",kind: "skill", langs: ["solidity"], focus: ["accounting","oracle","reentrancy"],                 promptPath: "skills/pashov/economic-security.md",weight: 0.9 },
  { id: "pashov-execution-trace",  kind: "skill", langs: ["solidity"], focus: ["reentrancy","logic","proxy"],                       promptPath: "skills/pashov/execution-trace.md",  weight: 0.85 },
  { id: "pashov-invariant",        kind: "skill", langs: ["solidity"], focus: ["accounting","logic"],                              promptPath: "skills/pashov/invariant.md",        weight: 0.85 },
  { id: "pashov-periphery",        kind: "skill", langs: ["solidity"], focus: ["oracle","proxy","logic"],                          promptPath: "skills/pashov/periphery.md",        weight: 0.8 },
  { id: "pashov-first-principles", kind: "skill", langs: ["solidity"], focus: ["logic","general"],                                 promptPath: "skills/pashov/first-principles.md", weight: 0.8 },
];

const ANALYZERS: AuditTool[] = [
  { id: "slither", kind: "analyzer", langs: ["solidity"], focus: ["reentrancy","access-control","uninitialized","detectors"], command: "slither", weight: 0.9 },
  { id: "aderyn",  kind: "analyzer", langs: ["solidity"], focus: ["detectors","best-practice"],                                command: "aderyn",  weight: 0.7 },
];

function loadExternal(): AuditTool[] {
  const hub = process.env.AUDITFLOW_HUB ?? process.cwd();
  try {
    const txt = readFileSync(join(hub, "skills/external/_manifest.txt"), "utf8");
    return txt.split("\n").filter(Boolean).map((line) => {
      const [id, focus, weight] = line.split("|");
      return {
        id, kind: "skill" as const, langs: ["solidity"],
        focus: (focus || "general").split(","),
        promptPath: `skills/external/${id}.md`,
        weight: Number(weight) || 0.75,
      };
    });
  } catch { return []; }
}

export const REGISTRY: AuditTool[] = [...PASHOV, ...loadExternal(), ...ANALYZERS];
