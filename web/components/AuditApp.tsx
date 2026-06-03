"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

const GithubMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 014 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </svg>
);

type Sev = "High" | "Medium" | "Low" | "QA" | "Gas";
type User = { login: string; avatar_url: string };
type Finding = {
  id: string; severity: Sev; title: string; file: string; lines: [number, number];
  impact: string; recommendation: string; tool: string; suggestedDiff?: string;
};

const SEV_COLOR: Record<Sev, string> = {
  High: "#ef4444", Medium: "#f59e0b", Low: "#3b82f6", QA: "#8b5cf6", Gas: "#10b981",
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
        if (msg.type === "event") setLog((l) => [...l, `${msg.phase}: ${msg.detail}`]);
        if (msg.type === "result") {
          setSummary(msg.summary); setMarkdown(msg.markdown);
          setFindings(msg.findings ?? []); setSessionId(msg.sessionId ?? "");
          setSelected(new Set((msg.findings ?? []).filter((f: Finding) => f.suggestedDiff).map((f: Finding) => f.id)));
        }
        if (msg.type === "error") setLog((l) => [...l, `error: ${msg.message}`]);
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
    if (j.prUrl) setPrUrl(j.prUrl); else setLog((l) => [...l, `error: PR — ${j.error}`]);
    setCreatingPR(false);
  }

  return (
    <div className="rounded-3xl border border-border bg-frame p-6 sm:p-8">
      {user ? (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <img src={user.avatar_url} width={22} height={22} className="rounded-full" alt="" />
          <span className="text-muted-foreground">Connected as <b className="text-foreground">{user.login}</b></span>
          <a href="/api/auth/logout" className="ml-auto text-xs text-muted-foreground hover:text-foreground">Disconnect</a>
        </div>
      ) : (
        <a href="/api/auth/github" className="mb-4 inline-flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground/5">
          <GithubMark className="h-4 w-4" /> Connect GitHub
        </a>
      )}

      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Repository URL</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repo"
          className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring" />
        <button onClick={start} disabled={running || !url}
          className="rounded-xl bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40">
          {running ? "Auditing…" : "Run audit"}
        </button>
      </div>

      <AnimatePresence>
        {log.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="mt-5 max-h-52 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[11px] text-muted-foreground">
            {log.map((l, i) => <div key={i}>› {l}</div>)}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {summary && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <div className="mb-4 grid grid-cols-5 gap-2">
              {(Object.keys(SEV_COLOR) as Sev[]).map((s) => (
                <div key={s} className="rounded-xl border border-border bg-muted p-3 text-center">
                  <div className="text-2xl font-semibold" style={{ color: SEV_COLOR[s] }}>{summary[s]}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s}</div>
                </div>
              ))}
            </div>

            {prUrl && (
              <a href={prUrl} className="mb-4 block rounded-xl border border-accent bg-card-secondary p-3 text-sm text-card-foreground">
                ⎇ PR opened — {prUrl}
              </a>
            )}

            <h3 className="mb-3 text-sm font-semibold">Findings — pick fixes for the PR</h3>
            <div className="flex flex-col gap-2">
              {findings.map((f, i) => (
                <motion.label key={f.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025 }}
                  className="flex items-start gap-3 rounded-xl border border-border bg-background p-3"
                  style={{ borderLeft: `3px solid ${SEV_COLOR[f.severity]}`, opacity: f.suggestedDiff ? 1 : 0.6, cursor: f.suggestedDiff ? "pointer" : "default" }}>
                  <input type="checkbox" disabled={!f.suggestedDiff} checked={selected.has(f.id)} onChange={() => toggle(f.id)} className="mt-1 accent-accent" />
                  <div className="min-w-0">
                    <div className="text-sm">
                      <span className="font-semibold" style={{ color: SEV_COLOR[f.severity] }}>{f.severity}</span>
                      <span className="text-foreground"> · {f.title}</span>
                      <span className="ml-1 text-[10px] text-muted-foreground">[{f.tool}]</span>
                    </div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">
                      {f.file}:{f.lines[0]}{!f.suggestedDiff && " · no auto-fix"}
                    </div>
                  </div>
                </motion.label>
              ))}
            </div>

            {user ? (
              <button onClick={createPR} disabled={creatingPR || selected.size === 0}
                className="mt-4 rounded-xl bg-accent px-6 py-3 text-sm font-medium text-card-foreground transition-opacity hover:opacity-90 disabled:opacity-40">
                {creatingPR ? "Creating PR…" : `Create PR with ${selected.size} fix(es)`}
              </button>
            ) : (
              <p className="mt-4 text-xs text-amber-600">Connect GitHub to open the auto-fix PR.</p>
            )}

            <details className="mt-4 text-sm text-muted-foreground">
              <summary className="cursor-pointer">Full report (markdown)</summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-background p-3 text-[11px]">{markdown}</pre>
            </details>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
