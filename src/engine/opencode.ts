// Skill engine: drive OpenCode CLI with the free DeepSeek model.
// Falls back to raw DeepSeek API if `opencode` binary is absent.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import type { AuditTool, Finding, TargetRepo } from "../types";
import { buildSkillPrompt } from "./prompt";

// Default engine = OpenCode driving OpenRouter's free DeepSeek model (no billing).
const MODEL = process.env.AUDITFLOW_MODEL ?? "openrouter/deepseek/deepseek-chat-v3-0324:free";
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

function runOpenCode(prompt: string, cwd: string): string {
  const res = spawnSync("opencode", ["run", "--model", MODEL, prompt], {
    cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, timeout: 8 * 60_000,
  });
  if (res.error) throw res.error;
  return res.stdout ?? "";
}

async function runDeepSeekDirect(prompt: string): Promise<string> {
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    }),
  });
  const j = await r.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

export async function runSkill(tool: AuditTool, repo: TargetRepo, hubRoot: string): Promise<Finding[]> {
  const prompt = buildSkillPrompt(tool, repo, hubRoot);
  let raw = "";
  // Server mode: a DeepSeek key means call the REST API directly (no opencode binary).
  // Local mode: AUDITFLOW_ENGINE=opencode forces the CLI path.
  const preferRest = DEEPSEEK_KEY && process.env.AUDITFLOW_ENGINE !== "opencode";
  if (preferRest) {
    raw = await runDeepSeekDirect(prompt);
  } else {
    try {
      raw = runOpenCode(prompt, repo.localPath);
    } catch {
      if (!DEEPSEEK_KEY) return [];
      raw = await runDeepSeekDirect(prompt);
    }
  }
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
