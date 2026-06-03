// Curated Solidity/EVM tool registry. Only EVM-relevant skills + static analyzers.
// Move/Rust/mobile skills in the hub are excluded from this scope.
import type { AuditTool } from "../types";

export const REGISTRY: AuditTool[] = [
  // --- LLM-driven skills (live in repo root as submodules) ---
  { id: "pashov-skills",    kind: "skill", langs: ["solidity"], focus: ["logic","access-control","accounting","reentrancy"], promptPath: "pashov-skills/SKILL.md", weight: 1.0 },
  { id: "scv-scan",         kind: "skill", langs: ["solidity"], focus: ["scv","common-vulns","swc"],                       promptPath: "scv-scan/SKILL.md",      weight: 0.8 },
  { id: "sc-auditor",       kind: "skill", langs: ["solidity"], focus: ["general","best-practice"],                       promptPath: "sc-auditor/SKILL.md",    weight: 0.8 },
  { id: "SolidityGuard",    kind: "skill", langs: ["solidity"], focus: ["evm","gas","general"],                          promptPath: "SolidityGuard/SKILL.md", weight: 0.8 },
  { id: "GPTScan",          kind: "skill", langs: ["solidity"], focus: ["logic","program-analysis"],                      promptPath: "GPTScan/SKILL.md",       weight: 0.7 },
  { id: "krait",            kind: "skill", langs: ["solidity"], focus: ["general","ai-first"],                           promptPath: "krait/SKILL.md",         weight: 0.7 },
  { id: "cdsecurity-skills",kind: "skill", langs: ["solidity"], focus: ["general","claude-code"],                        promptPath: "cdsecurity-skills/SKILL.md", weight: 0.7 },
  { id: "web3-skills",      kind: "skill", langs: ["solidity"], focus: ["general"],                                      promptPath: "web3-skills/contract-auditor/SKILL.md", weight: 0.7 },

  // --- static analyzers (binaries; deterministic, fast) ---
  { id: "slither", kind: "analyzer", langs: ["solidity"], focus: ["reentrancy","access-control","uninitialized","detectors"], command: "slither", weight: 0.9 },
  { id: "aderyn",  kind: "analyzer", langs: ["solidity"], focus: ["detectors","best-practice"],                                command: "aderyn",  weight: 0.7 },
];
