// Builds the audit prompt fed to the OpenCode/DeepSeek engine for a skill.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AuditTool, TargetRepo } from "../types";

const OUTPUT_CONTRACT = `
You are a smart-contract security auditor. Audit ONLY the Solidity files listed.
Return findings as a single fenced JSON array. Each item:
{
  "severity": "High|Medium|Low|QA|Gas",
  "title": "short title",
  "file": "relative/path.sol",
  "lines": [start, end],
  "impact": "what an attacker gains or what breaks",
  "description": "root cause",
  "poc": "concrete steps or code (optional)",
  "recommendation": "how to fix",
  "suggestedDiff": "unified diff that fixes it (optional, valid patch)"
}
Rules: report only real, exploitable issues. No false positives. If none, return [].
Output ONLY the JSON block, nothing else.
`;

export function buildSkillPrompt(tool: AuditTool, repo: TargetRepo, hubRoot: string): string {
  let skillBody = "";
  if (tool.promptPath) {
    try { skillBody = readFileSync(join(hubRoot, tool.promptPath), "utf8"); } catch { /* skill md optional */ }
  }
  const fileList = repo.contracts.slice(0, 80).join("\n");
  return [
    `# Audit methodology (${tool.id})`,
    skillBody.slice(0, 8000),
    `\n# Target: ${repo.owner}/${repo.name} (${repo.framework})`,
    `Contracts to audit (paths relative to repo root ${repo.localPath}):`,
    fileList,
    OUTPUT_CONTRACT,
  ].join("\n");
}
