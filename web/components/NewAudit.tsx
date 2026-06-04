"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, FolderGit2, Paperclip, ArrowLeft, Loader2 } from "lucide-react";

const GithubMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 014 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </svg>
);

type Sev = "High" | "Medium" | "Low" | "QA" | "Gas";
type Finding = { id: string; severity: Sev; title: string; file: string; lines: [number, number]; tool: string; suggestedDiff?: string };
type Summary = Record<Sev, number>;
type Audit = { repo: string; ts: number; summary: Summary; findings: Finding[]; prUrl?: string; sessionId?: string };
type User = { login: string; avatar_url: string };
type Repo = { name: string; full_name: string; html_url: string; language: string | null };
type Branch = { name: string; sha: string };

const HIST_KEY = "auditflow.history";
const SEV_COLOR: Record<Sev, string> = { High: "#ef4444", Medium: "#f59e0b", Low: "#3b82f6", QA: "#8b5cf6", Gas: "#10b981" };
const STEPS = ["Repository", "Target", "Contracts", "Docs", "Review"] as const;

const loadHist = (): Audit[] => { try { return JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); } catch { return []; } };
const saveHist = (h: Audit[]) => localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 30)));

export default function NewAudit() {
  const [step, setStep] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [showUrl, setShowUrl] = useState(false);

  // selections
  const [url, setUrl] = useState("");
  const [repoLabel, setRepoLabel] = useState("");
  const [branch, setBranch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [defaultBranch, setDefaultBranch] = useState("");
  const [tagCommit, setTagCommit] = useState("");
  const [scopeMode, setScopeMode] = useState<"auto" | "manual">("auto");
  const [solFiles, setSolFiles] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [docs, setDocs] = useState("");
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // run state
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState<Summary | null>(null);

  useEffect(() => { fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setUser).catch(() => {}); }, []);
  useEffect(() => {
    if (!user) return;
    fetch("/api/repos").then((r) => (r.ok ? r.json() : { repos: [] })).then((j) => setRepos(j.repos ?? [])).catch(() => {});
  }, [user]);

  const ref = (tagCommit.trim() || branch || "").trim();
  const latestCommit = useMemo(() => branches.find((b) => b.name === branch)?.sha ?? "", [branches, branch]);

  function chooseRepo(u: string, label: string) { setUrl(u); setRepoLabel(label); }

  // Step 1 -> 2: load branches for the chosen repo.
  async function gotoTarget() {
    if (!url.trim()) return;
    setStep(1); setLoadingBranches(true); setBranches([]); setBranch(""); setDefaultBranch("");
    try {
      const j = await fetch(`/api/branches?url=${encodeURIComponent(url.trim())}`).then((r) => r.json());
      const bs: Branch[] = j.branches ?? [];
      setBranches(bs); setDefaultBranch(j.defaultBranch ?? "main");
      setBranch(bs.find((b) => b.name === j.defaultBranch)?.name ?? bs[0]?.name ?? j.defaultBranch ?? "main");
    } finally { setLoadingBranches(false); }
  }

  // Step 2 -> 3.
  function gotoContracts() { setStep(2); }

  // Step 3 -> 4: if manual, load the .sol file list at the chosen ref.
  async function gotoDocs() {
    if (scopeMode === "manual" && solFiles.length === 0) {
      setLoadingFiles(true);
      try {
        const j = await fetch(`/api/contracts?url=${encodeURIComponent(url.trim())}&ref=${encodeURIComponent(ref || "HEAD")}`).then((r) => r.json());
        setSolFiles(j.files ?? []);
      } finally { setLoadingFiles(false); }
    }
    setStep(3);
  }

  function togglePick(p: string) {
    setPicked((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });
  }

  // Step 5: kick the real audit (SSE), persist to dashboard history.
  async function startAudit() {
    setRunning(true); setLog([]); setDone(null);
    const scopeFiles = scopeMode === "manual" ? [...picked] : undefined;
    const res = await fetch("/api/audit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), ref: ref || undefined, scopeFiles }),
    });
    const reader = res.body!.getReader(); const dec = new TextDecoder(); let buf = "";
    let summary: Summary | null = null, findings: Finding[] = [], sessionId = "";
    for (;;) {
      const { value, done: d } = await reader.read(); if (d) break;
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
      const repo = url.trim().replace(/^https?:\/\/github\.com\//, "");
      const hist = [{ repo, ts: Date.now(), summary, findings, sessionId }, ...loadHist()];
      saveHist(hist); setDone(summary);
    }
    setRunning(false);
  }

  const canContinue = [!!url.trim(), !!branch, true, true, true][step];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* top bar */}
      <header className="flex items-center justify-between border-b border-border px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-accent" />
          <span className="text-sm font-semibold">AuditFlow</span>
        </div>
        <a href="/dashboard" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </a>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
        <h1 className="text-2xl font-semibold">New audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">Set up a new security audit in a few steps.</p>

        {/* stepper */}
        <div className="mt-6 flex items-center">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium ${
                  i < step ? "bg-foreground text-background" : i === step ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                }`}>
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={`text-[13px] ${i === step ? "font-medium text-foreground" : "text-muted-foreground"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className="mx-3 h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-frame p-6 sm:p-8">
          {/* ───── Step 1 · Repository ───── */}
          {step === 0 && (
            <>
              <h2 className="text-lg font-semibold">Select repository</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pick a repository or add one from GitHub.</p>

              {user ? (
                repos.length === 0 ? (
                  <p className="mt-5 text-sm text-muted-foreground">Loading repos…</p>
                ) : (
                  <div className="mt-5 max-h-64 space-y-1 overflow-auto">
                    {repos.map((r) => {
                      const u = r.html_url;
                      const active = url === u;
                      return (
                        <button key={r.full_name} onClick={() => chooseRepo(u, r.full_name)}
                          className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm ${
                            active ? "border-accent bg-card-secondary" : "border-border bg-background hover:bg-muted"}`}>
                          <FolderGit2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{r.full_name}</span>
                          {r.language && <span className="ml-auto text-[10px] text-muted-foreground">{r.language}</span>}
                          {active && <Check className="h-4 w-4 text-accent" />}
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="mt-5 rounded-xl border border-accent/40 bg-card-secondary p-4">
                  <p className="text-sm font-medium text-card-foreground">Link your GitHub account</p>
                  <p className="mt-1 text-sm text-muted-foreground">Connect to list and audit your private repositories.</p>
                  <a href="/api/auth/github" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-frame px-4 py-2 text-sm font-medium hover:bg-muted">
                    <GithubMark className="h-4 w-4" /> Connect GitHub
                  </a>
                </div>
              )}

              {/* public URL */}
              <button onClick={() => setShowUrl((v) => !v)} className="mt-5 text-xs font-medium text-muted-foreground hover:text-foreground">
                {showUrl ? "Hide public URL" : "Public URL"}
              </button>
              {showUrl && (
                <div className="mt-2 flex gap-2">
                  <input value={url} onChange={(e) => { setUrl(e.target.value); setRepoLabel(e.target.value.replace(/^https?:\/\/github\.com\//, "")); }}
                    placeholder="https://github.com/owner/repo"
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-ring" />
                </div>
              )}

              <Footer onBack={null} onNext={gotoTarget} nextLabel="Continue" disabled={!canContinue} />
            </>
          )}

          {/* ───── Step 2 · Target ───── */}
          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold">Select target</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose a branch or provide a tag / commit reference.</p>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <FolderGit2 className="h-4 w-4" /> {repoLabel || url}
              </div>

              <label className="mt-5 block text-xs font-medium text-muted-foreground">Branch</label>
              <div className="relative mt-1.5">
                <select value={branch} onChange={(e) => setBranch(e.target.value)} disabled={loadingBranches}
                  className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring">
                  {loadingBranches && <option>Loading…</option>}
                  {branches.map((b) => <option key={b.name} value={b.name}>{b.name}{b.name === defaultBranch ? " (default)" : ""}</option>)}
                  {!loadingBranches && branches.length === 0 && <option value={defaultBranch || "main"}>{defaultBranch || "main"}</option>}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              {latestCommit && <p className="mt-1.5 text-xs text-muted-foreground">Latest commit <span className="font-mono">{latestCommit.slice(0, 7)}</span></p>}

              <label className="mt-5 block text-xs font-medium text-muted-foreground">Tag or commit <span className="text-muted-foreground/60">(optional)</span></label>
              <input value={tagCommit} onChange={(e) => setTagCommit(e.target.value)} placeholder="v1.2.3 or 40-character commit hash"
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring" />

              <Footer onBack={() => setStep(0)} onNext={gotoContracts} nextLabel="Continue" disabled={!branch} />
            </>
          )}

          {/* ───── Step 3 · Contracts ───── */}
          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold">Audit scope</h2>
              <p className="mt-1 text-sm text-muted-foreground">Let agents decide what to analyse, or pick contracts yourself.</p>

              <button onClick={() => setScopeMode("auto")}
                className={`mt-5 w-full rounded-xl border p-4 text-left ${scopeMode === "auto" ? "border-accent bg-card-secondary" : "border-border bg-background hover:bg-muted"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Let agents decide</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600">Recommended</span>
                  {scopeMode === "auto" && <span className="ml-auto h-3.5 w-3.5 rounded-full bg-accent" />}
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">Agents analyse the repository structure and decide which contracts matter, following imports and dependencies automatically.</p>
              </button>

              <button onClick={() => setScopeMode("manual")}
                className={`mt-3 w-full rounded-xl border p-4 text-left ${scopeMode === "manual" ? "border-accent bg-card-secondary" : "border-border bg-background hover:bg-muted"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Choose contracts manually</span>
                  {scopeMode === "manual" && <span className="ml-auto h-3.5 w-3.5 rounded-full bg-accent" />}
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">Pick specific Solidity files to scope the audit and exclude unrelated code.</p>
              </button>

              <Footer onBack={() => setStep(1)} onNext={gotoDocs} nextLabel={loadingFiles ? "Loading files…" : "Continue"} disabled={loadingFiles} />
            </>
          )}

          {/* ───── Step 4 · Docs ───── */}
          {step === 3 && (
            <>
              {scopeMode === "manual" && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold">Select contracts</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{solFiles.length} Solidity file(s) found · {picked.size} selected.</p>
                  <div className="mt-3 max-h-52 space-y-1 overflow-auto rounded-xl border border-border bg-background p-2">
                    {solFiles.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">No .sol files found at this ref. Agents will decide instead.</p>}
                    {solFiles.map((f) => (
                      <label key={f} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-muted">
                        <input type="checkbox" checked={picked.has(f)} onChange={() => togglePick(f)} className="accent-accent" />
                        <span className="truncate font-mono text-xs">{f}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <h2 className="text-lg font-semibold">Additional documentation</h2>
              <p className="mt-1 text-sm text-muted-foreground">Source code and in-repo docs are always analyzed. Add external links or notes for extra context.</p>
              <div className="mt-3 flex items-start gap-2">
                <textarea value={docs} onChange={(e) => setDocs(e.target.value)} rows={3} placeholder="Paste a link or type notes…"
                  className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring" />
                <Paperclip className="mt-3 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Optional — skip this step if all documentation lives inside the repository.</p>

              <Footer onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel="Continue" disabled={false} />
            </>
          )}

          {/* ───── Step 5 · Review ───── */}
          {step === 4 && !running && !done && (
            <>
              <h2 className="text-lg font-semibold">Review &amp; confirm</h2>
              <p className="mt-1 text-sm text-muted-foreground">Confirm the details below, then start the audit.</p>

              <dl className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border">
                <Row k="Repository" v={repoLabel || url} />
                <Row k="Branch" v={branch || defaultBranch} />
                {(tagCommit.trim() || latestCommit) && <Row k="Commit" mono v={tagCommit.trim() || latestCommit} />}
                <Row k="Contracts" v={scopeMode === "auto" ? "Agents decide" : `${picked.size} file(s) selected`} />
              </dl>

              <div className="mt-4 overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06]">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium">Security audit</span>
                  <span className="text-sm font-semibold text-emerald-600">Free</span>
                </div>
                <p className="px-4 pb-3 text-xs text-muted-foreground">Hackathon build · DeepSeek engine via OpenCode Zen. The audit starts immediately and typically runs in a few minutes — live progress appears below.</p>
              </div>

              <Footer onBack={() => setStep(3)} onNext={startAudit} nextLabel="Start audit" disabled={false} />
            </>
          )}

          {/* running / result */}
          {(running || done) && (
            <>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Auditing {repoLabel}…</> : "Audit complete"}
              </h2>
              {log.length > 0 && (
                <div className="mt-4 max-h-60 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[11px] text-muted-foreground">
                  {log.map((l, i) => <div key={i}>› {l}</div>)}
                </div>
              )}
              {done && (
                <>
                  <div className="mt-5 grid grid-cols-5 gap-2">
                    {(Object.keys(SEV_COLOR) as Sev[]).map((s) => (
                      <div key={s} className="rounded-xl border border-border bg-muted p-3 text-center">
                        <div className="text-2xl font-semibold" style={{ color: SEV_COLOR[s] }}>{done[s]}</div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s}</div>
                      </div>
                    ))}
                  </div>
                  <a href="/dashboard" className="mt-5 inline-flex rounded-xl bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-90">
                    View in dashboard →
                  </a>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-background px-4 py-3">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</dt>
      <dd className={`truncate text-sm font-medium ${mono ? "font-mono text-xs" : ""}`}>{v}</dd>
    </div>
  );
}

function Footer({ onBack, onNext, nextLabel, disabled }: { onBack: (() => void) | null; onNext: () => void; nextLabel: string; disabled: boolean }) {
  return (
    <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
      {onBack ? (
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">Back</button>
      ) : <span />}
      <button onClick={onNext} disabled={disabled}
        className="rounded-xl bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40">
        {nextLabel}
      </button>
    </div>
  );
}
