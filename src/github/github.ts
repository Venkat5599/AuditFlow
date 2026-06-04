// GitHub integration: clone target + open an auto-fix PR with applied diffs.
// Disk policy: clones are TRANSIENT — created for one operation, deleted right
// after. Never held during the idle wait between audit and PR.
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Octokit } from "@octokit/rest";
import type { AuditReport, Finding, TargetRepo } from "../types";
import { validateDiffs, safeDiffs } from "./validate";
import { applyPatch } from "./patch";

export function parseRepoUrl(url: string): { owner: string; name: string } {
  const m = url.replace(/\.git$/, "").match(/github\.com[/:]([^/]+)\/([^/]+)/);
  if (!m) throw new Error(`Not a GitHub URL: ${url}`);
  return { owner: m[1], name: m[2] };
}

// Best-effort delete of a transient clone dir.
export function cleanupClone(dir?: string) {
  if (!dir) return;
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* already gone */ }
}

// Safety net: sweep stale auditflow-* temp clones older than maxAgeMs.
export function sweepTemp(maxAgeMs = 15 * 60_000) {
  try {
    const t = tmpdir();
    for (const name of readdirSync(t)) {
      if (!name.startsWith("auditflow-") && !name.startsWith("af-validate-")) continue;
      const p = join(t, name);
      try { if (Date.now() - statSync(p).mtimeMs > maxAgeMs) rmSync(p, { recursive: true, force: true }); } catch {}
    }
  } catch {}
}

// Clone (shallow) with the user's OAuth token so private repos work too.
// Clone a repo. `ref` (optional) pins to a branch, tag, or commit SHA.
// Branch/tag → shallow clone of that ref. Commit SHA → full clone + checkout
// (a depth-1 clone can't reach an arbitrary historical commit).
export function cloneRepo(url: string, token?: string, ref?: string): TargetRepo {
  const { owner, name } = parseRepoUrl(url);
  const dir = mkdtempSync(join(tmpdir(), "auditflow-"));
  const auth = token ? `https://x-access-token:${token}@github.com/${owner}/${name}.git` : url;
  const isCommit = !!ref && /^[0-9a-f]{7,40}$/i.test(ref);

  // --recurse-submodules so foundry `lib/` deps exist for the compile gate.
  const sub = ["--recurse-submodules", "--shallow-submodules"];
  const cloneArgs = ref && !isCommit
    ? ["clone", "--depth", "1", ...sub, "--branch", ref, auth, dir]
    : isCommit
      ? ["clone", ...sub, auth, dir]               // full clone so the SHA is reachable
      : ["clone", "--depth", "1", ...sub, auth, dir];
  const res = spawnSync("git", cloneArgs, { encoding: "utf8" });
  if (res.status !== 0) throw new Error(`clone failed: ${res.stderr}`);

  if (isCommit) {
    const co = spawnSync("git", ["checkout", ref!], { cwd: dir, encoding: "utf8" });
    if (co.status !== 0) throw new Error(`checkout ${ref} failed: ${co.stderr}`);
  }

  const branch = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: dir, encoding: "utf8" })
    .stdout.trim() || "main";
  return { url, owner, name, defaultBranch: branch, localPath: dir, contracts: [], framework: "unknown" };
}

// Open an auto-fix PR. Clones the repo FRESH (transient), applies selected +
// validated diffs, pushes, opens the PR, then deletes the clone in finally.
// The audit's own clone is already gone by the time this runs.
export async function openFixPR(
  repo: TargetRepo, report: AuditReport, token: string, selectedIds?: string[]
): Promise<string> {
  const chosen = selectedIds?.length
    ? report.findings.filter((f) => selectedIds.includes(f.id))
    : report.findings;
  const withDiffs = chosen.filter((f) => f.suggestedDiff?.trim());
  if (withDiffs.length === 0) throw new Error("No fixes selected to apply");

  // Fresh transient clone for the PR operation.
  const fresh = cloneRepo(repo.url, token);
  try {
    // Validate diffs against this clone (apply-check + compile gate).
    const validation = validateDiffs(fresh, withDiffs);
    const fixes = safeDiffs(validation);
    const rejected = validation.length - fixes.length;
    if (fixes.length === 0) throw new Error("No diffs passed the validation gate");

    const branch = `auditflow/fixes-${Date.now()}`;
    const sh = (args: string[]) => spawnSync("git", args, { cwd: fresh.localPath, encoding: "utf8" });
    sh(["checkout", "-b", branch]);

    let applied = 0;
    for (const f of fixes) {
      if (applyPatch(fresh.localPath, f.suggestedDiff!, { check: false, file: f.file })) applied++;
    }
    if (applied === 0) throw new Error("No diffs applied cleanly");

    writeFileSync(join(fresh.localPath, "AUDITFLOW_REPORT.md"), report.markdown);
    sh(["add", "-A"]);
    sh(["-c", "user.email=bot@auditflow.dev", "-c", "user.name=AuditFlow Bot",
        "commit", "-m", `fix: apply AuditFlow security fixes (${applied} findings)`]);

    const pushUrl = `https://x-access-token:${token}@github.com/${fresh.owner}/${fresh.name}.git`;
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
      owner: fresh.owner, repo: fresh.name, head: branch, base: fresh.defaultBranch,
      title: `AuditFlow: ${applied} security fixes`, body,
    });
    return pr.data.html_url;
  } finally {
    cleanupClone(fresh.localPath);
  }
}
