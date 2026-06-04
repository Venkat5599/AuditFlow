// Robust patch application for LLM-generated diffs, which routinely drift on
// line numbers, whitespace, and path prefixes. We try a cascade of increasingly
// lenient strategies (git apply variants, then fuzzy `patch`) so a basically-correct
// fix still lands. Shared by the validation gate and the PR writer so "passes
// validation" and "applies in the PR" use identical logic.
import { spawnSync } from "node:child_process";
import { writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

// Normalize a diff: guarantee a trailing newline, and if the +++/--- headers
// point at a path that doesn't exist in the repo, rewrite them to the known
// finding file (LLMs often drop the directory or the a//b/ prefix).
export function normalizeDiff(diff: string, repoRoot: string, file?: string): string {
  let d = diff.replace(/\r\n/g, "\n");
  if (!d.endsWith("\n")) d += "\n";

  // Extract the target path the diff claims to touch.
  const plus = d.match(/^\+\+\+ (?:b\/)?(.+)$/m)?.[1]?.trim();
  const claimed = plus && plus !== "/dev/null" ? plus.replace(/^b\//, "") : undefined;
  const resolves = claimed && existsSync(join(repoRoot, claimed));

  if (!resolves && file && existsSync(join(repoRoot, file))) {
    // Rewrite both header lines to the real file.
    d = d
      .replace(/^--- .*$/m, `--- a/${file}`)
      .replace(/^\+\+\+ .*$/m, `+++ b/${file}`);
    // Drop any leading `diff --git` line that references the wrong path.
    d = d.replace(/^diff --git .*$/m, `diff --git a/${file} b/${file}`);
  }
  return d;
}

// Apply (or, with check=true, test-apply) a patch. Returns true on first success.
export function applyPatch(cwd: string, diff: string, opts: { check: boolean; file?: string }): boolean {
  const patch = join(cwd, ".auditflow.patch");
  const norm = normalizeDiff(diff, cwd, opts.file);
  writeFileSync(patch, norm);

  const base = opts.check ? ["apply", "--check"] : ["apply"];
  const gitModes: string[][] = [
    [...base, "-p1", patch],
    [...base, "-p0", patch],
    [...base, "-p1", "--recount", "--ignore-whitespace", patch],
    [...base, "-p1", "-C1", "--recount", "--ignore-whitespace", patch],
    [...(opts.check ? ["apply", "--check"] : ["apply", "--whitespace=fix"]), "-p1", "--recount", "--ignore-whitespace", patch],
  ];
  for (const args of gitModes) {
    if (spawnSync("git", args, { cwd, encoding: "utf8" }).status === 0) { cleanup(patch); return true; }
  }

  // Last resort: GNU patch with fuzz (tolerates context drift git won't).
  const patchArgs = opts.check
    ? ["-p1", "--dry-run", "--fuzz=3", "-i", patch]
    : ["-p1", "--fuzz=3", "-i", patch];
  const fuzz = spawnSync("patch", patchArgs, { cwd, encoding: "utf8" });
  cleanup(patch);
  return fuzz.status === 0;
}

function cleanup(patch: string) { try { rmSync(patch, { force: true }); } catch {} }
