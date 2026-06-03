// POST /api/chat { messages, auditedRepos? } -> SSE.
// The agent chats about security; when the latest user message contains a GitHub
// repo URL, it first RUNS the audit pipeline (streaming phases), then explains the
// findings conversationally. Heavy work runs on the VPS (Vercel proxies here).
import { chatStream, findRepoUrl, AGENT_SYSTEM, type ChatMessage } from "../../../../src/engine/chat";
import { runAudit } from "../../../../src/orchestrator/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

function cookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: ChatMessage[] };
  const token = cookie(req, "af_gh_token") ?? process.env.GITHUB_TOKEN ?? undefined;
  const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const repoUrl = findRepoUrl(last);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (o: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
      try {
        const convo: ChatMessage[] = [{ role: "system", content: AGENT_SYSTEM }, ...messages];

        if (repoUrl) {
          send({ type: "status", text: `Running audit on ${repoUrl}…` });
          const { report } = await runAudit({
            url: repoUrl, githubToken: token, createPR: false,
            onEvent: (e) => send({ type: "phase", phase: e.phase, detail: e.detail }),
          });
          send({ type: "findings", sessionId: "", summary: report.summary, findings: report.findings });
          // Feed a compact findings digest to the model to explain.
          const digest = report.findings.slice(0, 20)
            .map((f) => `- [${f.severity}] ${f.title} (${f.file}:${f.lines[0]}) — ${f.impact}`).join("\n");
          convo.push({
            role: "user",
            content: `Audit of ${repoUrl} finished. Summary ${JSON.stringify(report.summary)}.\nTop findings:\n${digest}\n\nGive me a short security briefing: the most serious issues, why they matter on Mantle, and what to fix first.`,
          });
        }

        for await (const chunk of chatStream(convo)) send({ type: "token", text: chunk });
        send({ type: "done" });
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
