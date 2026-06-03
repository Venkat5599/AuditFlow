// Curated Solidity/EVM tool registry. Only EVM-relevant skills + static analyzers.
// Primary LLM skills = pashov solidity-auditor agents, vendored into skills/pashov/
// so they ship with the app (self-contained, deploy-safe). Each agent is a focused
// methodology (attack vectors, math, access control, etc.) + shared rules + judging.
import type { AuditTool } from "../types";

export const REGISTRY: AuditTool[] = [
  // --- pashov solidity-auditor specialist agents (bundled) ---
  { id: "pashov-vector-scan",      kind: "skill", langs: ["solidity"], focus: ["logic","reentrancy","access-control","accounting"], promptPath: "skills/pashov/vector-scan.md",      weight: 1.0 },
  { id: "pashov-access-control",   kind: "skill", langs: ["solidity"], focus: ["access-control","proxy"],                           promptPath: "skills/pashov/access-control.md",   weight: 0.95 },
  { id: "pashov-math-precision",   kind: "skill", langs: ["solidity"], focus: ["accounting","math","oracle"],                       promptPath: "skills/pashov/math-precision.md",   weight: 0.95 },
  { id: "pashov-economic-security",kind: "skill", langs: ["solidity"], focus: ["accounting","oracle","reentrancy"],                 promptPath: "skills/pashov/economic-security.md",weight: 0.9 },
  { id: "pashov-execution-trace",  kind: "skill", langs: ["solidity"], focus: ["reentrancy","logic","proxy"],                       promptPath: "skills/pashov/execution-trace.md",  weight: 0.85 },
  { id: "pashov-invariant",        kind: "skill", langs: ["solidity"], focus: ["accounting","logic"],                              promptPath: "skills/pashov/invariant.md",        weight: 0.85 },
  { id: "pashov-periphery",        kind: "skill", langs: ["solidity"], focus: ["oracle","proxy","logic"],                          promptPath: "skills/pashov/periphery.md",        weight: 0.8 },
  { id: "pashov-first-principles", kind: "skill", langs: ["solidity"], focus: ["logic","general"],                                 promptPath: "skills/pashov/first-principles.md", weight: 0.8 },

  // --- static analyzers (binaries; deterministic, fast) ---
  { id: "slither", kind: "analyzer", langs: ["solidity"], focus: ["reentrancy","access-control","uninitialized","detectors"], command: "slither", weight: 0.9 },
  { id: "aderyn",  kind: "analyzer", langs: ["solidity"], focus: ["detectors","best-practice"],                                command: "aderyn",  weight: 0.7 },
];
