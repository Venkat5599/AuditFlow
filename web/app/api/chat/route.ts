// POST /api/chat { messages, auditedRepos? } -> SSE.
// The agent chats about security; when the latest user message contains a GitHub
// repo URL, it first RUNS the audit pipeline (streaming phases), then explains the
// findings conversationally. Heavy work runs on the VPS (Vercel proxies here).
import { chatStream, findRepoUrl, AGENT_SYSTEM, type ChatMessage } from "../../../../src/engine/chat";
import { runAudit } from "../../../../src/orchestrator/pipeline";
import { listUserRepos } from "../../../../src/github/oauth";

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

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (o: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
      try {
        const convo: ChatMessage[] = [{ role: "system", content: AGENT_SYSTEM }, ...messages];

        // Resolve the target repo: a full GitHub URL, or a repo NAME matched
        // against the connected user's repos.
        let repoUrl = findRepoUrl(last);
        let repos: { name: string; full_name: string; html_url: string }[] = [];
        if (token) {
          try { repos = await listUserRepos(token); } catch { /* ignore */ }
          if (!repoUrl) {
            const lc = last.toLowerCase();
            const hit = repos.find((r) => new RegExp(`\\b${r.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lc));
            if (hit) repoUrl = hit.html_url;
          }
          if (repos.length) {
            convo.splice(1, 0, { role: "system", content: `The connected user's repos (audit by name): ${repos.slice(0, 40).map((r) => r.name).join(", ")}.` });
          }
        }

        if (repoUrl) {
          const wantPR = Boolean(token); // connected -> open a PR after the audit
          send({ type: "status", text: `Running audit on ${repoUrl}…${wantPR ? " (will open a PR)" : ""}` });
          const { report, prUrl } = await runAudit({
            url: repoUrl, githubToken: token, createPR: wantPR,
            onEvent: (e) => send({ type: "phase", phase: e.phase, detail: e.detail }),
          });
          send({ type: "findings", sessionId: "", summary: report.summary, findings: report.findings, prUrl });
          const digest = report.findings.slice(0, 20)
            .map((f) => `- [${f.severity}] ${f.title} (${f.file}:${f.lines[0]}) — ${f.impact}`).join("\n");
          convo.push({
            role: "user",
            content: `Audit of ${repoUrl} finished. Summary ${JSON.stringify(report.summary)}.\nTop findings:\n${digest}\n${prUrl ? `An auto-fix PR was opened: ${prUrl}` : "No PR opened (not connected, or no safe fixes)."}\n\nGive me a short security briefing: the most serious issues, why they matter on Mantle, what to fix first${prUrl ? ", and mention the PR link" : ""}. The repo clone was deleted after auditing.`,
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
