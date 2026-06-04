// Auto-fix generator. Static analyzers (slither) and many LLM findings carry no
// patch, so the PR has nothing to apply. Instead of trusting a hand-written diff,
// we ask the model for the COMPLETE corrected file, write it into the live clone,
// and let `git diff` produce the patch — which is therefore guaranteed to apply.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Finding, TargetRepo } from "../types";
import { runEngine } from "./opencode";

const MAX_FILE = 24_000; // skip huge files — keep the prompt/cost bounded
const PRIORITY = new Set(["High", "Medium", "Low"]);

function fixPrompt(f: Finding, source: string): string {
  return [
    "You are fixing ONE security issue in a Solidity file. Make the MINIMAL change that",
    "fixes only this issue; keep all other code byte-for-byte identical.",
    "",
    `Issue (${f.severity}): ${f.title}`,
    `Why it matters: ${f.impact || f.description || ""}`,
    `Recommended fix: ${f.recommendation || "apply the standard secure pattern"}`,
    `Location: ${f.file} lines ${f.lines?.[0]}-${f.lines?.[1]}`,
    "",
    `--- current ${f.file} ---`,
    source,
    "--- end ---",
    "",
    "Return ONLY the complete corrected file inside a single ```solidity fenced block.",
    "No explanation. If you cannot fix it safely, return the file unchanged.",
  ].join("\n");
}

function extractCode(out: string): string | null {
  const fence = out.match(/```(?:solidity|sol)?\s*([\s\S]*?)```/);
  const body = (fence ? fence[1] : out).trim();
  return body.includes("pragma") || body.includes("contract") || body.includes("function") ? body : null;
}

// Fill `suggestedDiff` (via git diff) for findings that lack one. Mutates findings.
// Capped to keep LLM calls/time bounded on the free gateway. Restores the clone.
export async function generateFixes(
  repo: TargetRepo,
  findings: Finding[],
  emit: (e: { phase: string; detail: string }) => void = () => {},
  max = Number(process.env.AUDITFLOW_MAX_FIXES ?? 3), // ~60s/fix on free gateway; keep under the 300s PR budget
): Promise<void> {
  if (!repo.localPath) return;
  const candidates = findings.filter(
    (f) => !f.suggestedDiff?.trim() && f.file && PRIORITY.has(f.severity) && existsSync(join(repo.localPath, f.file)),
  );
  let made = 0;
  for (const f of candidates) {
    if (made >= max) break;
    const abs = join(repo.localPath, f.file);
    let orig: string;
    try { orig = readFileSync(abs, "utf8"); } catch { continue; }
    if (orig.length > MAX_FILE) continue;

    emit({ phase: "fix", detail: `${f.title.slice(0, 48)} (${made + 1}/${Math.min(max, candidates.length)})` });
    let out = "";
    try { out = await runEngine(fixPrompt(f, orig), repo.localPath); } catch { continue; }
    const fixed = extractCode(out);
    if (!fixed || fixed.trim() === orig.trim()) continue;

    writeFileSync(abs, fixed.endsWith("\n") ? fixed : fixed + "\n");
    const diff = spawnSync("git", ["diff", "--", f.file], { cwd: repo.localPath, encoding: "utf8" }).stdout ?? "";
    spawnSync("git", ["checkout", "--", f.file], { cwd: repo.localPath }); // restore clone
    if (diff.trim()) { f.suggestedDiff = diff; made++; }
  }
  if (made) emit({ phase: "fix", detail: `generated ${made} auto-fix diff(s)` });
}
