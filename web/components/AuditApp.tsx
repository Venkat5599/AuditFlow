"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

type Sev = "High" | "Medium" | "Low" | "QA" | "Gas";
type User = { login: string; avatar_url: string };
type Finding = {
  id: string; severity: Sev; title: string; file: string; lines: [number, number];
  impact: string; recommendation: string; tool: string; suggestedDiff?: string;
};

const SEV_COLOR: Record<Sev, string> = {
  High: "var(--red)", Medium: "var(--orange)", Low: "var(--amber)", QA: "var(--blue)", Gas: "var(--green)",
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
        if (msg.type === "event") setLog((l) => [...l, `${msg.phase.toUpperCase().padEnd(9)} ${msg.detail}`]);
        if (msg.type === "result") {
          setSummary(msg.summary); setMarkdown(msg.markdown);
          setFindings(msg.findings ?? []); setSessionId(msg.sessionId ?? "");
          setSelected(new Set((msg.findings ?? []).filter((f: Finding) => f.suggestedDiff).map((f: Finding) => f.id)));
        }
        if (msg.type === "error") setLog((l) => [...l, `ERROR     ${msg.message}`]);
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
    if (j.prUrl) setPrUrl(j.prUrl); else setLog((l) => [...l, `ERROR     PR: ${j.error}`]);
    setCreatingPR(false);
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* control panel */}
      <div className="panel p-5 sm:p-6">
        {user ? (
          <div className="mb-4 flex items-center gap-2 text-xs">
            <img src={user.avatar_url} width={20} height={20} className="rounded-full" alt="" />
            <span style={{ color: "var(--t2)" }}>CONNECTED · <b style={{ color: "var(--green)" }}>{user.login}</b></span>
            <a href="/api/auth/logout" className="ml-auto tracking-widest hover:underline" style={{ color: "var(--t4)" }}>DISCONNECT</a>
          </div>
        ) : (
          <a href="/api/auth/github"
            className="mb-4 inline-flex items-center gap-2 rounded border px-4 py-2 text-xs tracking-widest"
            style={{ borderColor: "var(--b2)", color: "var(--t1)" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 014 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            CONNECT GITHUB
          </a>
        )}

        <div className="mb-1.5 text-[10px] tracking-widest" style={{ color: "var(--t3)" }}>TARGET REPOSITORY</div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repo"
            className="flex-1 rounded px-4 py-3 text-sm outline-none"
            style={{ background: "var(--s0)", border: "1px solid var(--b2)", color: "var(--t1)" }} />
          <button onClick={start} disabled={running || !url}
            className="rounded px-6 py-3 text-xs font-bold tracking-widest disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--s0)" }}>
            {running ? "AUDITING…" : "RUN AUDIT →"}
          </button>
        </div>

        {/* terminal log */}
        <AnimatePresence>
          {log.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="mt-5 max-h-52 overflow-auto rounded p-3 text-[11px] leading-relaxed"
              style={{ background: "var(--s0)", border: "1px solid var(--b1)", color: "var(--green)" }}>
              {log.map((l, i) => (
                <div key={i}><span style={{ color: "var(--t4)" }}>›</span> {l}</div>
              ))}
              {running && <div className="cursor-blink" style={{ color: "var(--t3)" }}>› </div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* results */}
      <AnimatePresence>
        {summary && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
            <div className="mb-4 grid grid-cols-5 gap-2">
              {(Object.keys(SEV_COLOR) as Sev[]).map((s) => (
                <div key={s} className="panel stripe p-3 text-center" style={{ ["--stripe" as string]: SEV_COLOR[s] }}>
                  <div className="text-2xl font-black" style={{ color: SEV_COLOR[s] }}>{summary[s]}</div>
                  <div className="text-[10px] tracking-widest" style={{ color: "var(--t3)" }}>{s.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {prUrl && (
              <a href={prUrl} className="mb-4 block rounded p-3 text-xs"
                style={{ border: "1px solid var(--green)", background: "rgba(0,229,160,0.08)", color: "var(--green)" }}>
                ⎇ PR OPENED — {prUrl}
              </a>
            )}

            <div className="sec-title mb-3">FINDINGS — SELECT FIXES FOR PR</div>
            <div className="flex flex-col gap-2">
              {findings.map((f, i) => (
                <motion.label key={f.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025 }}
                  className="finding panel flex items-start gap-3 p-3"
                  style={{ ["--sev" as string]: SEV_COLOR[f.severity], cursor: f.suggestedDiff ? "pointer" : "default", opacity: f.suggestedDiff ? 1 : 0.6 }}>
                  <input type="checkbox" disabled={!f.suggestedDiff} checked={selected.has(f.id)} onChange={() => toggle(f.id)} className="mt-1" />
                  <div className="min-w-0">
                    <div className="text-sm">
                      <span className="font-bold" style={{ color: SEV_COLOR[f.severity] }}>{f.severity.toUpperCase()}</span>
                      <span style={{ color: "var(--t1)" }}> · {f.title}</span>
                      <span className="ml-1 text-[10px]" style={{ color: "var(--t4)" }}>[{f.tool}]</span>
                    </div>
                    <div className="truncate text-[11px]" style={{ color: "var(--t3)" }}>
                      {f.file}:{f.lines[0]}{!f.suggestedDiff && " · no auto-fix"}
                    </div>
                  </div>
                </motion.label>
              ))}
            </div>

            {user ? (
              <button onClick={createPR} disabled={creatingPR || selected.size === 0}
                className="mt-4 rounded px-6 py-3 text-xs font-bold tracking-widest disabled:opacity-40"
                style={{ background: "var(--green)", color: "var(--s0)" }}>
                {creatingPR ? "CREATING PR…" : `CREATE PR · ${selected.size} FIX(ES)`}
              </button>
            ) : (
              <p className="mt-4 text-[11px]" style={{ color: "var(--amber)" }}>CONNECT GITHUB TO OPEN THE AUTO-FIX PR.</p>
            )}

            <details className="mt-4 text-xs" style={{ color: "var(--t2)" }}>
              <summary className="cursor-pointer tracking-widest">FULL REPORT (MARKDOWN)</summary>
              <pre className="mt-2 whitespace-pre-wrap rounded p-3 text-[11px]" style={{ background: "var(--s0)", border: "1px solid var(--b1)" }}>{markdown}</pre>
            </details>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
