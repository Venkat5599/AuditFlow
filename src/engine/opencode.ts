// Skill engine: call the OpenCode Zen gateway (OpenAI-compatible) with the free
// DeepSeek model. No binary, no local CLI — works headless on the VPS.
// Optional fallbacks: opencode CLI (if AUDITFLOW_ENGINE=opencode) or DeepSeek platform.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import type { AuditTool, Finding, TargetRepo } from "../types";
import { buildSkillPrompt } from "./prompt";

// OpenCode Zen gateway. Key = OPENCODE_API_KEY (sk-...). Free model below.
const ZEN_BASE = process.env.OPENCODE_BASE ?? "https://opencode.ai/zen/v1";
const ZEN_KEY = process.env.OPENCODE_API_KEY ?? "";
const MODEL = process.env.AUDITFLOW_MODEL ?? "deepseek-v4-flash-free";
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? "";

function hashId(f: Partial<Finding>): string {
  return createHash("sha1").update(`${f.file}:${f.lines?.[0]}:${f.title}`).digest("hex").slice(0, 12);
}

function extractJson(raw: string): any[] {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : raw;
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start === -1 || end === -1) return [];
  try { return JSON.parse(body.slice(start, end + 1)); } catch { return []; }
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// OpenAI-compatible chat call against an arbitrary base + key.
// Retries on 429 (free-tier rate limit) with exponential backoff.
async function chat(base: string, key: string, model: string, prompt: string): Promise<string> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 90_000); // don't let one call hang the run
    let r: Response;
    try {
      r = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0 }),
        signal: ac.signal,
      });
    } finally { clearTimeout(to); }
    if (r.status === 429) {
      const wait = Number(r.headers.get("retry-after")) * 1000 || 1500 * 2 ** attempt;
      await sleep(Math.min(wait, 15000));
      continue;
    }
    if (!r.ok) throw new Error(`gateway ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return j?.choices?.[0]?.message?.content ?? "";
  }
  return ""; // give up after retries — skill yields no findings rather than crashing
}

// Local opencode CLI path (opt-in via AUDITFLOW_ENGINE=opencode).
function runOpenCodeCli(prompt: string, cwd: string): string {
  const res = spawnSync("opencode", ["run", "--model", `opencode/${MODEL}`, prompt], {
    cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, timeout: 4 * 60_000,
  });
  if (res.error) throw res.error;
  return res.stdout ?? "";
}

export async function runEngine(prompt: string, cwd: string): Promise<string> {
  if (process.env.AUDITFLOW_ENGINE === "opencode") return runOpenCodeCli(prompt, cwd);
  if (ZEN_KEY) return chat(ZEN_BASE, ZEN_KEY, MODEL, prompt);
  if (DEEPSEEK_KEY) return chat("https://api.deepseek.com", DEEPSEEK_KEY, "deepseek-chat", prompt);
  return ""; // no engine configured -> no LLM findings (analyzers + Mantle still run)
}

export async function runSkill(tool: AuditTool, repo: TargetRepo, hubRoot: string): Promise<Finding[]> {
  const prompt = buildSkillPrompt(tool, repo, hubRoot);
  let raw = "";
  try { raw = await runEngine(prompt, repo.localPath); }
  catch { return []; } // one skill failing must not kill the whole audit
  return extractJson(raw).map((f) => ({
    id: hashId(f),
    severity: f.severity ?? "Low",
    title: f.title ?? "Untitled",
    file: f.file ?? "",
    lines: Array.isArray(f.lines) ? f.lines : [0, 0],
    impact: f.impact ?? "",
    description: f.description ?? "",
    poc: f.poc,
    recommendation: f.recommendation ?? "",
    suggestedDiff: f.suggestedDiff,
    tool: tool.id,
    confidence: "medium" as const,
  }));
}
