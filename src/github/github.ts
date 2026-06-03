// GitHub integration: clone target + open an auto-fix PR with applied diffs.
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Octokit } from "@octokit/rest";
import type { AuditReport, Finding, TargetRepo } from "../types";
import { validateDiffs, safeDiffs } from "./validate";

export function parseRepoUrl(url: string): { owner: string; name: string } {
  const m = url.replace(/\.git$/, "").match(/github\.com[/:]([^/]+)\/([^/]+)/);
  if (!m) throw new Error(`Not a GitHub URL: ${url}`);
  return { owner: m[1], name: m[2] };
}

// Clone (shallow) with the user's OAuth token so private repos work too.
export function cloneRepo(url: string, token?: string): TargetRepo {
  const { owner, name } = parseRepoUrl(url);
  const dir = mkdtempSync(join(tmpdir(), "auditflow-"));
  const auth = token ? `https://x-access-token:${token}@github.com/${owner}/${name}.git` : url;
  const res = spawnSync("git", ["clone", "--depth", "1", auth, dir], { encoding: "utf8" });
  if (res.status !== 0) throw new Error(`clone failed: ${res.stderr}`);
  const branch = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: dir, encoding: "utf8" })
    .stdout.trim() || "main";
  return { url, owner, name, defaultBranch: branch, localPath: dir, contracts: [], framework: "unknown" };
}

// Apply each finding's suggestedDiff, commit on a new branch, open PR.
export async function openFixPR(
  repo: TargetRepo, report: AuditReport, token: string, selectedIds?: string[]
): Promise<string> {
  // Triage: if a selection is given, only consider those findings.
  const chosen = selectedIds?.length
    ? report.findings.filter((f) => selectedIds.includes(f.id))
    : report.findings;
  // Only PR fixes that apply cleanly AND compile (when a compiler exists).
  const validation = validateDiffs(repo, chosen);
  const fixes = safeDiffs(validation);
  const rejected = validation.length - fixes.length;
  const branch = `auditflow/fixes-${Date.now()}`;
  const sh = (args: string[]) => spawnSync("git", args, { cwd: repo.localPath, encoding: "utf8" });

  sh(["checkout", "-b", branch]);
  let applied = 0;
  for (const f of fixes) {
    const patchFile = join(repo.localPath, ".auditflow.patch");
    writeFileSync(patchFile, f.suggestedDiff!.endsWith("\n") ? f.suggestedDiff! : f.suggestedDiff! + "\n");
    const r = sh(["apply", "--whitespace=fix", patchFile]);
    if (r.status === 0) applied++;
  }
  if (applied === 0) throw new Error("No diffs applied cleanly");

  // Drop the report into the repo for reviewers.
  writeFileSync(join(repo.localPath, "AUDITFLOW_REPORT.md"), report.markdown);
  sh(["add", "-A"]);
  sh(["-c", "user.email=bot@auditflow.dev", "-c", "user.name=AuditFlow Bot",
      "commit", "-m", `fix: apply AuditFlow security fixes (${applied} findings)`]);

  const pushUrl = `https://x-access-token:${token}@github.com/${repo.owner}/${repo.name}.git`;
  const push = sh(["push", pushUrl, branch]);
  if (push.status !== 0) throw new Error(`push failed: ${push.stderr}`);

  const gh = new Octokit({ auth: token });
  const body = [
    `## 🛡️ AuditFlow automated security fixes`,
    `Applied **${applied}** fixes from an AuditFlow audit (${rejected} rejected by validation gate).`,
    ``,
    `| Severity | Count |`, `|---|---|`,
    ...(["High", "Medium", "Low", "QA", "Gas"] as const).map((s) => `| ${s} | ${report.summary[s]} |`),
    ``,
    `Full report committed as \`AUDITFLOW_REPORT.md\`. Review each diff before merging.`,
  ].join("\n");
  const pr = await gh.pulls.create({
    owner: repo.owner, repo: repo.name, head: branch, base: repo.defaultBranch,
    title: `AuditFlow: ${applied} security fixes`, body,
  });
  return pr.data.html_url;
}
