// Shared types for the AuditFlow orchestration pipeline.

export type Severity = "High" | "Medium" | "Low" | "QA" | "Gas";

export interface Finding {
  id: string;                 // stable hash: file+line+title
  severity: Severity;
  title: string;
  file: string;               // relative path in target repo
  lines: [number, number];    // [start, end]
  impact: string;             // what an attacker gains / what breaks
  description: string;        // root cause
  poc?: string;               // proof-of-concept (code or steps)
  recommendation: string;     // how to fix
  suggestedDiff?: string;     // unified diff to apply as auto-fix
  tool: string;               // which skill/analyzer found it
  confidence: "high" | "medium" | "low";
}

export interface TargetRepo {
  url: string;                // https://github.com/owner/name
  owner: string;
  name: string;
  defaultBranch: string;
  localPath: string;          // cloned dir
  contracts: string[];        // detected .sol files (relative)
  framework: "foundry" | "hardhat" | "truffle" | "raw" | "unknown";
}

export interface AuditTool {
  id: string;                 // dir name in repo root, e.g. "scv-scan"
  kind: "skill" | "analyzer"; // skill = LLM-driven, analyzer = static binary
  langs: string[];            // ["solidity"]
  focus: string[];            // ["reentrancy","access-control",...]
  promptPath?: string;        // SKILL.md path for skill kind
  command?: string;           // CLI for analyzer kind, e.g. "slither"
  weight: number;             // base relevance weight
}

export interface AuditReport {
  repo: TargetRepo;
  findings: Finding[];
  summary: { High: number; Medium: number; Low: number; QA: number; Gas: number };
  toolsRun: string[];
  startedAt: string;
  finishedAt: string;
  markdown: string;           // C4-format report
}
