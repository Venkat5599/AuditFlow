"use client";
import { useEffect, useMemo, useState } from "react";
import { LayoutDashboard, ShieldAlert, FileSearch, GitPullRequest, Bot, FolderGit2, Plus, ArrowLeft, Code2 } from "lucide-react";
import ChatAgent from "@/components/ChatAgent";
import CodeViewer from "@/components/CodeViewer";

type Sev = "High" | "Medium" | "Low" | "QA" | "Gas";
type Finding = { id: string; severity: Sev; title: string; file: string; lines: [number, number]; tool: string; suggestedDiff?: string };
type Summary = Record<Sev, number>;
type Audit = { repo: string; ts: number; summary: Summary; findings: Finding[]; prUrl?: string; sessionId?: string };

const GithubMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 014 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </svg>
);

const SEV_COLOR: Record<Sev, string> = { High: "#ef4444", Medium: "#f59e0b", Low: "#3b82f6", QA: "#8b5cf6", Gas: "#10b981" };
const HIST_KEY = "auditflow.history";

const loadHist = (): Audit[] => { try { return JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); } catch { return []; } };
const saveHist = (h: Audit[]) => localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 30)));

type View = "dashboard" | "findings" | "prs" | "agent" | "code";

export default function Dashboard() {
  const [view, setView] = useState<View>("dashboard");
  const [hist, setHist] = useState<Audit[]>([]);
  const [url, setUrl] = useState("");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [user, setUser] = useState<{ login: string; avatar_url: string } | null>(null);
  const [repos, setRepos] = useState<{ name: string; full_name: string; html_url: string; language: string | null }[]>([]);
  const [prBusy, setPrBusy] = useState(false);
  const [prErr, setPrErr] = useState("");
  // Code (VSCode-style) explorer state.
  const [codeRepo, setCodeRepo] = useState("");   // owner/name or full url
  const [codeFiles, setCodeFiles] = useState<string[]>([]);
  const [codeActive, setCodeActive] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  useEffect(() => { setHist(loadHist()); }, []);
  useEffect(() => { fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setUser).catch(() => {}); }, []);
  useEffect(() => {
    if (!user) return;
    fetch("/api/repos").then((r) => (r.ok ? r.json() : { repos: [] })).then((j) => setRepos(j.repos ?? [])).catch(() => {});
  }, [user]);

  function runRepo(fullName: string) { run(`https://github.com/${fullName}`); }

  const latest = hist[0];
  const stats = useMemo(() => {
    const high = latest ? latest.summary.High : 0;
    const prs = hist.filter((a) => a.prUrl).length;
    return {
      high, prs, repos: hist.length,
      contracts: latest ? new Set(latest.findings.map((f) => f.file)).size : 0,
    };
  }, [hist, latest]);

  async function run(target?: string) {
    const repoUrl = (target ?? url).trim();
    if (!repoUrl || running) return;
    setRunning(true); setLog([]); setView("dashboard");
    let summary: Summary | null = null, findings: Finding[] = [], sessionId = "";
    const res = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: repoUrl }) });
    const reader = res.body!.getReader(); const dec = new TextDecoder(); let buf = "";
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n"); buf = parts.pop() ?? "";
      for (const p of parts) {
        const line = p.replace(/^data: /, "").trim(); if (!line) continue;
        const m = JSON.parse(line);
        if (m.type === "event") setLog((l) => [...l, `${m.phase}: ${m.detail}`]);
        if (m.type === "result") { summary = m.summary; findings = m.findings ?? []; sessionId = m.sessionId ?? ""; }
        if (m.type === "error") setLog((l) => [...l, `error: ${m.message}`]);
      }
    }
    if (summary) {
      const repo = repoUrl.replace(/^https?:\/\/github\.com\//, "");
      const next = [{ repo, ts: Date.now(), summary, findings, sessionId }, ...hist];
      setHist(next); saveHist(next);
    }
    setRunning(false); setUrl("");
  }

  // Open an auto-fix PR for the latest audit. Sends the live sessionId when present,
  // and always includes repo + findings so the PR still opens if the server session
  // expired (in-memory store, lost on restart). Errors surface in the banner.
  async function createPR() {
    if (!latest || prBusy) return;
    // Diffs are generated server-side at PR time; select fixable severities (High/Med/Low),
    // or any finding that already carries a diff.
    const ids = latest.findings
      .filter((f) => f.suggestedDiff || ["High", "Medium", "Low"].includes(f.severity))
      .map((f) => f.id);
    if (ids.length === 0) { setPrErr("No fixable findings to PR."); return; }
    setPrBusy(true); setPrErr("");
    try {
      const r = await fetch("/api/pr", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: latest.sessionId, repo: latest.repo, findings: latest.findings, selectedIds: ids }),
      });
      const j = await r.json();
      if (j.prUrl) {
        const next = hist.map((a) => (a === latest ? { ...a, prUrl: j.prUrl } : a));
        setHist(next); saveHist(next); setView("prs");
      } else {
        setPrErr(j.error || `Request failed (${r.status})`);
      }
    } catch (e) {
      setPrErr((e as Error).message || "Network error");
    } finally {
      setPrBusy(false);
    }
  }

  const fixable = latest?.findings.filter((f) => f.suggestedDiff || ["High", "Medium", "Low"].includes(f.severity)).length ?? 0;

  // VSCode-style explorer: list a repo's .sol files (git-tree API, no clone).
  async function loadCode(repoStr: string) {
    const full = repoStr.trim().replace(/^https?:\/\/github\.com\//, "");
    if (!full) return;
    setCodeRepo(full); setCodeLoading(true); setCodeFiles([]); setCodeActive(null);
    try {
      const j = await fetch(`/api/contracts?url=${encodeURIComponent(`https://github.com/${full}`)}&ref=HEAD`).then((r) => r.json());
      const files: string[] = j.files ?? [];
      setCodeFiles(files); setCodeActive(files[0] ?? null);
    } finally { setCodeLoading(false); }
  }
  // Auto-open the latest audited repo when first entering the Code view.
  useEffect(() => { if (view === "code" && !codeRepo && latest) loadCode(latest.repo); /* eslint-disable-next-line */ }, [view]);

  const NAV: { id: View; icon: typeof LayoutDashboard; label: string }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "findings", icon: ShieldAlert, label: "Findings" },
    { id: "code", icon: Code2, label: "Code" },
    { id: "prs", icon: GitPullRequest, label: "Pull Requests" },
    { id: "agent", icon: Bot, label: "Agent" },
  ];

  const maxTotal = Math.max(1, ...hist.slice(0, 12).map((a) => a.summary.High + a.summary.Medium + a.summary.Low));

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-frame p-4 md:flex">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-accent" />
            <span className="text-sm font-semibold">AuditFlow</span>
          </div>
          <a href="/" className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-foreground/90 hover:bg-muted hover:text-foreground" title="Back to site">
            <ArrowLeft className="h-3.5 w-3.5" /> Site
          </a>
        </div>
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Workspace</div>
        <nav className="mb-6 space-y-0.5">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] ${view === n.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <n.icon className="h-4 w-4" /> {n.label}
            </button>
          ))}
        </nav>
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {user ? "Your repos" : "Recent repos"}
        </div>
        <div className="flex-1 space-y-0.5 overflow-auto">
          {!user && hist.length === 0 && <div className="px-2.5 text-[12px] text-muted-foreground">Connect GitHub to list repos</div>}
          {user && repos.length === 0 && <div className="px-2.5 text-[12px] text-muted-foreground">Loading repos…</div>}
          {user
            ? repos.slice(0, 40).map((r) => (
                <button key={r.full_name} onClick={() => runRepo(r.full_name)} disabled={running}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
                  <FolderGit2 className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{r.name}</span>
                  {r.language && <span className="ml-auto text-[9px] text-muted-foreground/60">{r.language}</span>}
                </button>
              ))
            : hist.slice(0, 12).map((a, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] text-muted-foreground">
                  <FolderGit2 className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{a.repo}</span>
                </div>
              ))}
        </div>
        <a href="/dashboard/new" className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-foreground px-3 py-2.5 text-[13px] font-medium text-background hover:opacity-90">
          <Plus className="h-4 w-4" /> New audit
        </a>
      </aside>

      {/* main */}
      <main className="min-h-0 flex-1 overflow-y-auto p-5 pb-16 sm:p-8 sm:pb-16">
        {/* run bar */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{view === "dashboard" ? "Audits" : view === "findings" ? "Findings" : view === "code" ? "Code" : view === "prs" ? "Pull Requests" : "Agent"}</h1>
          <div className="flex items-center gap-2">
            {user ? (
              <span className="hidden items-center gap-1.5 rounded-lg border border-border bg-frame px-3 py-2 text-xs sm:flex">
                <img src={user.avatar_url} width={18} height={18} className="rounded-full" alt="" />
                <b>{user.login}</b>
              </span>
            ) : (
              <a href="/api/auth/github" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-frame px-3 py-2 text-sm font-medium hover:bg-muted">
                <GithubMark className="h-4 w-4" /> Connect GitHub
              </a>
            )}
            {view !== "agent" && view !== "code" && (
              <>
                <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()}
                  placeholder="github.com/owner/repo" className="w-44 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring sm:w-64" />
                <button onClick={() => run()} disabled={running || !url}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40">
                  <Plus className="h-4 w-4" /> {running ? "Running…" : "Run audit"}
                </button>
              </>
            )}
          </div>
        </div>

        {running && (
          <div className="mb-6 max-h-40 overflow-auto rounded-xl border border-border bg-frame p-3 font-mono text-[11px] text-muted-foreground">
            {log.map((l, i) => <div key={i}>› {l}</div>)}
          </div>
        )}

        {view === "dashboard" && (
          <>
            {latest && fixable > 0 && (
              <div className="mb-5 rounded-xl border border-accent/60 bg-card-secondary p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-card-foreground">
                    Latest audit on <b>{latest.repo}</b> · {fixable} auto-fixable finding(s){latest.prUrl ? " · PR opened" : ""}.
                  </span>
                  {latest.prUrl ? (
                    <a href={latest.prUrl} className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background">View PR ⎇</a>
                  ) : user ? (
                    <button onClick={createPR} disabled={prBusy}
                      className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40">
                      {prBusy ? "Opening PR…" : "Create auto-fix PR"}
                    </button>
                  ) : (
                    <a href="/api/auth/github" className="rounded-lg border border-border bg-frame px-4 py-2 text-sm font-medium">Connect GitHub to PR</a>
                  )}
                </div>
                {prErr && <p className="mt-2 text-xs text-red-500">PR failed: {prErr}</p>}
              </div>
            )}
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "High severity", value: stats.high, sub: `across ${stats.contracts} contracts`, t: "latest" },
                { label: "Auto-fix PRs", value: stats.prs, sub: "validated & opened", t: "total" },
                { label: "Repos audited", value: stats.repos, sub: "all time", t: "" },
                { label: "Severity tiers", value: 5, sub: "H · M · L · QA · Gas", t: "live" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-frame p-4">
                  <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">{s.label}</span><span className="text-[10px] text-emerald-600">{s.t}</span></div>
                  <div className="mt-1 text-3xl font-semibold tracking-tight">{s.value}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-frame p-4">
              <div className="mb-1 text-sm font-semibold">Findings by audit</div>
              <div className="text-[11px] text-muted-foreground">Last {Math.min(12, hist.length)} audits · severity stacked</div>
              <div className="mt-4 flex h-44 items-end gap-2">
                {hist.length === 0 && <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">Run an audit to populate the chart</div>}
                {hist.slice(0, 12).reverse().map((a, i) => {
                  const total = a.summary.High + a.summary.Medium + a.summary.Low; const scale = 176 / maxTotal;
                  return (
                    <div key={i} className="flex flex-1 flex-col-reverse overflow-hidden rounded-md" style={{ height: Math.max(8, total * scale) }} title={a.repo}>
                      <div style={{ height: a.summary.Low * scale, background: SEV_COLOR.Low }} />
                      <div style={{ height: a.summary.Medium * scale, background: SEV_COLOR.Medium }} />
                      <div style={{ height: a.summary.High * scale, background: SEV_COLOR.High }} />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-4 text-[10px] text-muted-foreground">
                {(["High", "Medium", "Low"] as Sev[]).map((s) => (
                  <span key={s} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: SEV_COLOR[s] }} /> {s}</span>
                ))}
              </div>
            </div>
          </>
        )}

        {view === "findings" && (
          <div className="flex flex-col gap-2">
            {!latest && <div className="text-sm text-muted-foreground">No findings yet — run an audit.</div>}
            {latest?.findings.map((f) => (
              <div key={f.id} className="rounded-xl border border-border bg-frame p-3" style={{ borderLeft: `3px solid ${SEV_COLOR[f.severity]}` }}>
                <div className="text-sm"><span className="font-semibold" style={{ color: SEV_COLOR[f.severity] }}>{f.severity}</span> · {f.title} <span className="text-[10px] text-muted-foreground">[{f.tool}]</span></div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">{f.file}:{f.lines[0]}</div>
              </div>
            ))}
          </div>
        )}

        {view === "prs" && (
          <div className="flex flex-col gap-2">
            {!user && <p className="text-sm text-amber-600">Connect GitHub to open auto-fix PRs. <a href="/api/auth/github" className="underline">Connect</a></p>}
            {hist.filter((a) => a.prUrl).length === 0 && <div className="text-sm text-muted-foreground">No PRs opened yet.</div>}
            {hist.filter((a) => a.prUrl).map((a, i) => (
              <a key={i} href={a.prUrl} className="rounded-xl border border-border bg-frame p-3 text-sm text-foreground hover:bg-muted">⎇ {a.repo} — {a.prUrl}</a>
            ))}
          </div>
        )}

        {view === "code" && (
          <div className="flex h-[calc(100vh-9rem)] flex-col">
            <div className="mb-3 flex items-center gap-2">
              <input value={codeRepo} onChange={(e) => setCodeRepo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadCode(codeRepo)}
                placeholder="owner/repo" className="w-64 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring" />
              <button onClick={() => loadCode(codeRepo)} disabled={codeLoading || !codeRepo.trim()}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40">
                {codeLoading ? "Loading…" : "Open"}
              </button>
              <span className="text-xs text-muted-foreground">{codeFiles.length > 0 && `${codeFiles.length} Solidity file(s)`}</span>
            </div>
            <div className="grid flex-1 grid-cols-[minmax(0,16rem)_1fr] overflow-hidden rounded-xl border border-border">
              <div className="overflow-auto border-r border-border bg-frame p-2">
                {codeLoading && <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>}
                {!codeLoading && codeFiles.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">Enter a repo above to browse its contracts.</p>}
                {codeFiles.map((f) => (
                  <button key={f} onClick={() => setCodeActive(f)}
                    className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12px] ${codeActive === f ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60"}`}>
                    <FolderGit2 className="h-3 w-3 shrink-0" /> <span className="truncate font-mono">{f.split("/").pop()}</span>
                  </button>
                ))}
              </div>
              <CodeViewer url={`https://github.com/${codeRepo.replace(/^https?:\/\/github\.com\//, "")}`} refName="HEAD" path={codeActive} />
            </div>
          </div>
        )}

        {view === "agent" && <div className="h-[78vh]"><ChatAgent /></div>}
      </main>
    </div>
  );
}
