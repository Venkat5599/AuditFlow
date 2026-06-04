// POST /api/pr { sessionId?, repo?, findings?, selectedIds } -> validate selected diffs, open auto-fix PR.
// Works two ways: (1) live server session, or (2) client-supplied repo + findings
// (localStorage history) so the PR still opens after the session/process expires.
import { getSession, dropSession } from "../../../../src/orchestrator/sessions";
import { openFixPR, parseRepoUrl } from "../../../../src/github/github";
import type { AuditReport, Finding } from "../../../../src/types";

export const runtime = "nodejs";
export const maxDuration = 300;

function cookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// Rebuild a minimal report from client data when no live session exists.
function reportFromClient(repo: string, findings: Finding[]): AuditReport {
  const url = repo.startsWith("http") ? repo : `https://github.com/${repo}`;
  const { owner, name } = parseRepoUrl(url);
  return {
    repo: { url, owner, name, defaultBranch: "", localPath: "", contracts: [], framework: "unknown" },
    findings,
    summary: { High: 0, Medium: 0, Low: 0, QA: 0, Gas: 0 },
    toolsRun: [], startedAt: "", finishedAt: "", markdown: "",
  };
}

export async function POST(req: Request) {
  const { sessionId, selectedIds, repo, findings } = await req.json();
  const token = cookie(req, "af_gh_token") ?? process.env.GITHUB_TOKEN;
  if (!token) return Response.json({ error: "Not connected to GitHub" }, { status: 401 });

  let report = sessionId ? getSession(sessionId) : null;
  if (!report) {
    if (repo && Array.isArray(findings) && findings.length) {
      try { report = reportFromClient(repo, findings); }
      catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }
    } else {
      return Response.json({ error: "Session expired and no findings provided — re-run the audit" }, { status: 404 });
    }
  }

  try {
    const prUrl = await openFixPR(report.repo, report, token, selectedIds);
    if (sessionId) dropSession(sessionId);
    return Response.json({ prUrl });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
