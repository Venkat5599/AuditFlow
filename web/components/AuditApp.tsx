"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import SpotlightCard from "./reactbits/SpotlightCard";
import { cn } from "../lib/cn";

type Sev = "High" | "Medium" | "Low" | "QA" | "Gas";
type User = { login: string; avatar_url: string };
type Finding = {
  id: string; severity: Sev; title: string; file: string; lines: [number, number];
  impact: string; recommendation: string; tool: string; suggestedDiff?: string;
};

const SEV: Record<Sev, { color: string; bg: string }> = {
  High:   { color: "#ff6b6b", bg: "rgba(255,107,107,0.12)" },
  Medium: { color: "#ffb340", bg: "rgba(255,179,64,0.12)" },
  Low:    { color: "#5eead4", bg: "rgba(94,234,212,0.12)" },
  QA:     { color: "#9aa3b2", bg: "rgba(154,163,178,0.12)" },
  Gas:    { color: "#a3e635", bg: "rgba(163,230,53,0.12)" },
};

export default function AuditApp() {
  const [url, setUrl] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [summary, setSummary] = useState<Record<Sev, number> | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sessionId, setSessionId] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [prUrl, setPrUrl] = useState("");
  const [running, setRunning] = useState(false);
  const [creatingPR, setCreatingPR] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setUser).catch(() => {});
  }, []);

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function start() {
    setRunning(true); setLog([]); setSummary(null); setMarkdown(""); setPrUrl("");
    setFindings([]); setSelected(new Set()); setSessionId("");
    const res = await fetch("/api/audit", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }),
    });
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n"); buf = parts.pop() ?? "";
      for (const p of parts) {
        const line = p.replace(/^data: /, "").trim();
        if (!line) continue;
        const msg = JSON.parse(line);
        if (msg.type === "event") setLog((l) => [...l, `[${msg.phase}] ${msg.detail}`]);
        if (msg.type === "result") {
          setSummary(msg.summary); setMarkdown(msg.markdown);
          setFindings(msg.findings ?? []); setSessionId(msg.sessionId ?? "");
          setSelected(new Set((msg.findings ?? []).filter((f: Finding) => f.suggestedDiff).map((f: Finding) => f.id)));
        }
        if (msg.type === "error") setLog((l) => [...l, `❌ ${msg.message}`]);
      }
    }
    setRunning(false);
  }

  async function createPR() {
    setCreatingPR(true); setPrUrl("");
    const r = await fetch("/api/pr", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, selectedIds: [...selected] }),
    });
    const j = await r.json();
    if (j.prUrl) setPrUrl(j.prUrl); else setLog((l) => [...l, `❌ PR: ${j.error}`]);
    setCreatingPR(false);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <SpotlightCard className="p-6 sm:p-8">
        {/* connect */}
        {user ? (
          <div className="mb-5 flex items-center gap-2 text-sm">
            <img src={user.avatar_url} width={22} height={22} className="rounded-full" alt="" />
            <span className="text-white/70">Connected as <b className="text-white">{user.login}</b></span>
          </div>
        ) : (
          <a href="/api/auth/github"
            className="mb-5 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            Connect GitHub
          </a>
        )}

        <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Repository URL</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repo"
            className="flex-1 rounded-lg border border-[var(--color-line)] bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-[var(--color-brand)]"
          />
          <button
            onClick={start} disabled={running || !url}
            className="rounded-lg bg-gradient-to-r from-[#5eead4] to-[#818cf8] px-6 py-3 font-semibold text-black transition hover:opacity-90 disabled:opacity-40"
          >
            {running ? "Auditing…" : "Run audit"}
          </button>
        </div>

        {/* live log */}
        <AnimatePresence>
          {log.length > 0 && (
            <motion.pre
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="mt-5 max-h-44 overflow-auto rounded-lg bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-white/60"
            >
              {log.map((l, i) => <div key={i}>{l}</div>)}
            </motion.pre>
          )}
        </AnimatePresence>
      </SpotlightCard>

      {/* results */}
      <AnimatePresence>
        {summary && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <div className="mb-4 grid grid-cols-5 gap-2">
              {(Object.keys(SEV) as Sev[]).map((s) => (
                <div key={s} className="rounded-xl border border-[var(--color-line)] p-3 text-center"
                  style={{ background: SEV[s].bg }}>
                  <div className="text-2xl font-bold" style={{ color: SEV[s].color }}>{summary[s]}</div>
                  <div className="text-[10px] uppercase tracking-wide text-white/50">{s}</div>
                </div>
              ))}
            </div>

            {prUrl && (
              <a href={prUrl} className="mb-4 block rounded-lg border border-[#5eead4]/40 bg-[#5eead4]/10 p-3 text-sm text-[#5eead4]">
                🔀 PR opened — {prUrl}
              </a>
            )}

            <h3 className="mb-3 text-sm font-semibold text-white/80">Findings — pick fixes for the PR</h3>
            <div className="flex flex-col gap-2">
              {findings.map((f, i) => (
                <motion.label
                  key={f.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-3 transition hover:border-white/20",
                    !f.suggestedDiff && "cursor-default opacity-60"
                  )}
                  style={{ borderLeft: `3px solid ${SEV[f.severity].color}` }}
                >
                  <input type="checkbox" disabled={!f.suggestedDiff} checked={selected.has(f.id)}
                    onChange={() => toggle(f.id)} className="mt-1 accent-[#5eead4]" />
                  <div className="min-w-0">
                    <div className="text-sm">
                      <span className="font-bold" style={{ color: SEV[f.severity].color }}>{f.severity}</span>
                      <span className="text-white/90"> · {f.title}</span>
                      <span className="ml-1 text-[10px] text-white/35">[{f.tool}]</span>
                    </div>
                    <div className="truncate font-mono text-[11px] text-white/50">
                      {f.file}:{f.lines[0]}{!f.suggestedDiff && " · no auto-fix"}
                    </div>
                  </div>
                </motion.label>
              ))}
            </div>

            {user ? (
              <button onClick={createPR} disabled={creatingPR || selected.size === 0}
                className="mt-4 rounded-lg bg-gradient-to-r from-[#a3e635] to-[#5eead4] px-6 py-3 font-semibold text-black transition hover:opacity-90 disabled:opacity-40">
                {creatingPR ? "Creating PR…" : `Create PR with ${selected.size} fix(es)`}
              </button>
            ) : (
              <p className="mt-4 text-xs text-amber-400">Connect GitHub to open the auto-fix PR.</p>
            )}

            <details className="mt-4 text-sm text-white/60">
              <summary className="cursor-pointer">Full report (markdown)</summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-black/50 p-3 text-[11px]">{markdown}</pre>
            </details>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
