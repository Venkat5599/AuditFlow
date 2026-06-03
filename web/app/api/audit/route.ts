// POST /api/audit  { url } -> streams audit events (SSE), ends with report + sessionId.
// PR creation is a separate triage step (/api/pr) so users can pick findings first.
import { runAudit } from "../../../../src/orchestrator/pipeline";
import { saveSession } from "../../../../src/orchestrator/sessions";

export const runtime = "nodejs";
export const maxDuration = 300;

function cookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function POST(req: Request) {
  const { url } = await req.json();
  const token = cookie(req, "af_gh_token")
    ?? req.headers.get("x-github-token")
    ?? process.env.GITHUB_TOKEN
    ?? undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        // Audit only — never PR here. Triage happens after in /api/pr.
        const { report } = await runAudit({
          url, githubToken: token, createPR: false,
          onEvent: (e) => send({ type: "event", ...e }),
        });
        const sessionId = saveSession(report);
        send({ type: "result", sessionId, summary: report.summary, findings: report.findings, markdown: report.markdown });
      } catch (e) {
        send({ type: "error", message: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
