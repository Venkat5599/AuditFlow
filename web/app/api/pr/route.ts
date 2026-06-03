// POST /api/pr { sessionId, selectedIds } -> validate selected diffs, open auto-fix PR.
import { getSession, dropSession } from "../../../../src/orchestrator/sessions";
import { openFixPR } from "../../../../src/github/github";

export const runtime = "nodejs";
export const maxDuration = 300;

function cookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function POST(req: Request) {
  const { sessionId, selectedIds } = await req.json();
  const token = cookie(req, "af_gh_token") ?? process.env.GITHUB_TOKEN;
  if (!token) return Response.json({ error: "Not connected to GitHub" }, { status: 401 });

  const report = getSession(sessionId);
  if (!report) return Response.json({ error: "Session expired — re-run the audit" }, { status: 404 });

  try {
    const prUrl = await openFixPR(report.repo, report, token, selectedIds);
    dropSession(sessionId);
    return Response.json({ prUrl });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
