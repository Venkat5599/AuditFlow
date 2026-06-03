// Streaming chat against the OpenCode Zen gateway (OpenAI-compatible, stream:true).
// Used by the conversational audit agent.
const ZEN_BASE = process.env.OPENCODE_BASE ?? "https://opencode.ai/zen/v1";
const ZEN_KEY = process.env.OPENCODE_API_KEY ?? "";
const MODEL = process.env.AUDITFLOW_MODEL ?? "deepseek-v4-flash-free";

export interface ChatMessage { role: "system" | "user" | "assistant"; content: string; }

export const AGENT_SYSTEM = `You are AuditFlow, a smart-contract security agent for the Mantle (EVM L2) ecosystem.
You help users audit Solidity code. You can run a full audit pipeline (Slither, Aderyn, the pashov
solidity-auditor agents, and Mantle-specific detectors) when the user gives you a GitHub repo URL.
Be precise and security-focused. Explain vulnerabilities with impact + remediation. When discussing
Mantle, remember: MNT is the native gas token (ETH is an ERC-20), L1 data fee dominates cost,
blockhash is a weak RNG on L2. Keep answers tight and technical. Use markdown.`;

// Yields text chunks as they stream in. Falls back to a single non-streamed answer on error.
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function* chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  if (!ZEN_KEY) { yield "⚠️ Engine not configured (OPENCODE_API_KEY missing)."; return; }
  let r: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    r = await fetch(`${ZEN_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ZEN_KEY}` },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.3, stream: true }),
    });
    if (r.status === 429) {
      const wait = Number(r.headers.get("retry-after")) * 1000 || 1500 * 2 ** attempt;
      await sleep(Math.min(wait, 15000));
      continue;
    }
    break;
  }
  if (!r || !r.ok || !r.body) {
    yield r?.status === 429 ? "⚠️ The free model is rate-limited right now — give it a few seconds and try again." : `⚠️ Engine error ${r?.status ?? "unknown"}.`;
    return;
  }

  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const s = line.trim();
      if (!s.startsWith("data:")) continue;
      const payload = s.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const j = JSON.parse(payload);
        const delta = j?.choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch { /* partial JSON across chunks — ignore */ }
    }
  }
}

// Detect a GitHub repo URL in a message (audit intent).
export function findRepoUrl(text: string): string | null {
  const m = text.match(/https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/);
  return m ? m[0].replace(/[.,)]+$/, "") : null;
}
