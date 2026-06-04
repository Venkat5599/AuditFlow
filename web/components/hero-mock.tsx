"use client";
import { LayoutDashboard, ShieldAlert, FileSearch, GitPullRequest, Bot, FolderGit2, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: FileSearch, label: "Audits" },
  { icon: ShieldAlert, label: "Findings" },
  { icon: GitPullRequest, label: "Pull Requests" },
  { icon: Bot, label: "Agent" },
];

const REPOS = ["mantle/lsp", "owner/vault", "defi/lending", "nft/market"];

const STATS = [
  { label: "High severity", value: "6", trend: "+2", sub: "across 3 contracts", up: false },
  { label: "Auto-fix PRs", value: "4", trend: "+4", sub: "validated & opened", up: true },
  { label: "Repos audited", value: "128", trend: "+12%", sub: "this week", up: true },
  { label: "Skills run", value: "31", trend: "live", sub: "pashov · quillai · nemesis", up: true },
];

// Severity bars per recent audit (mock)
const AUDITS = [
  { h: 6, m: 1, l: 1 }, { h: 2, m: 3, l: 2 }, { h: 0, m: 2, l: 4 }, { h: 4, m: 1, l: 1 },
  { h: 1, m: 4, l: 3 }, { h: 3, m: 2, l: 2 }, { h: 0, m: 1, l: 5 }, { h: 5, m: 0, l: 1 },
  { h: 2, m: 2, l: 3 }, { h: 1, m: 3, l: 4 }, { h: 3, m: 1, l: 2 }, { h: 0, m: 2, l: 6 },
];
const SEV = { h: "#ef4444", m: "#f59e0b", l: "#3b82f6" };

export function HeroMock(): ReactNode {
  const maxTotal = Math.max(...AUDITS.map((a) => a.h + a.m + a.l));
  return (
    <div className="flex w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl">
      {/* sidebar */}
      <aside className="hidden w-52 shrink-0 border-r border-neutral-200 p-4 md:block">
        <div className="mb-6 flex items-center gap-2 text-accent">
          <LogoMark className="h-5 w-5" title="AuditFlow" />
          <span className="text-sm font-semibold text-foreground">AuditFlow</span>
        </div>
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-neutral-400">Workspace</div>
        <nav className="mb-6 space-y-0.5">
          {NAV.map((n) => (
            <div key={n.label} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] ${n.active ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-500"}`}>
              <n.icon className="h-4 w-4" /> {n.label}
            </div>
          ))}
        </nav>
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-neutral-400">Recent repos</div>
        <div className="space-y-0.5">
          {REPOS.map((r) => (
            <div key={r} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] text-neutral-500">
              <FolderGit2 className="h-3.5 w-3.5" /> {r}
            </div>
          ))}
        </div>
      </aside>

      {/* main */}
      <div className="flex-1 p-5">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm font-semibold">Audits</span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white">
            <Plus className="h-3.5 w-3.5" /> Run audit
          </span>
        </div>

        {/* stat cards */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-xl border border-neutral-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-neutral-500">{s.label}</span>
                <span className={`text-[10px] ${s.up ? "text-emerald-600" : "text-red-500"}`}>{s.trend}</span>
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{s.value}</div>
              <div className="mt-0.5 text-[10px] text-neutral-400">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* findings chart */}
        <div className="rounded-xl border border-neutral-200 p-4">
          <div className="mb-1 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Findings by audit</div>
              <div className="text-[11px] text-neutral-400">Last 12 audits · severity stacked</div>
            </div>
            <div className="flex gap-1 text-[10px]">
              <span className="rounded bg-neutral-100 px-2 py-1">7d</span>
              <span className="rounded bg-neutral-900 px-2 py-1 text-white">30d</span>
            </div>
          </div>
          <div className="mt-4 flex h-40 items-end gap-2">
            {AUDITS.map((a, i) => {
              const total = a.h + a.m + a.l;
              const scale = 140 / maxTotal;
              return (
                <div key={i} className="flex flex-1 flex-col-reverse overflow-hidden rounded-md" style={{ height: total * scale }}>
                  <div style={{ height: a.l * scale, background: SEV.l }} />
                  <div style={{ height: a.m * scale, background: SEV.m }} />
                  <div style={{ height: a.h * scale, background: SEV.h }} />
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-[10px] text-neutral-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: SEV.h }} /> High</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: SEV.m }} /> Medium</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: SEV.l }} /> Low</span>
          </div>
        </div>
      </div>
    </div>
  );
}
