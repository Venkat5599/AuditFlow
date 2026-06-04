"use client";

import { motion, type Transition } from "motion/react";
import { ShieldCheck, GitPullRequest, Boxes, Trash2, Zap } from "lucide-react";
import type { ReactNode } from "react";

const EASE = [0.23, 1, 0.32, 1] as const;
const cardAnimation = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
};
const t = (delay = 0): Transition => ({ duration: 0.8, ease: EASE, delay });

const SEV = [
  { k: "High", n: 6, c: "#ef4444" },
  { k: "Medium", n: 1, c: "#f59e0b" },
  { k: "Low", n: 1, c: "#3b82f6" },
  { k: "QA", n: 2, c: "#8b5cf6" },
  { k: "Gas", n: 1, c: "#10b981" },
];

function AuditFeedCard(): ReactNode {
  return (
    <motion.div {...cardAnimation} transition={t(0)}
      className="group flex min-h-140 flex-col overflow-hidden rounded-4xl bg-card-primary p-8 md:row-span-2">
      <div className="mb-6 text-center transition-transform duration-500 ease-out group-hover:scale-105">
        <h3 className="mb-3 text-2xl font-medium leading-tight text-neutral-900 md:text-4xl">
          31 audit tools, one orchestrator
        </h3>
        <p className="text-sm text-neutral-700">
          Static analyzers and LLM security detectors, with Mantle L2 checks — routed by signal, deduped, graded.
        </p>
      </div>
      <div className="flex flex-1 items-end justify-center">
        <div className="w-full max-w-xs overflow-hidden rounded-t-3xl border-6 border-b-0 border-neutral-900 bg-neutral-950 p-4 font-mono text-[11px] leading-relaxed text-emerald-400 shadow-2xl">
          <div className="text-neutral-500">› clone github.com/owner/vault</div>
          <div className="text-neutral-500">› route · signals: reentrancy, oracle</div>
          <div>› slither ✓  aderyn ✓  mantle ✓</div>
          <div>› reentrancy-scan (1/12)</div>
          <div>› access-control (2/12)</div>
          <div>› oracle-flashloan (3/12)</div>
          <div className="text-white">› report · 11 findings</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {SEV.map((s) => (
              <span key={s.k} className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "rgba(255,255,255,.08)", color: s.c }}>{s.k} {s.n}</span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MantleCard(): ReactNode {
  return (
    <motion.div {...cardAnimation} transition={t(0.1)}
      className="group relative flex min-h-80 flex-col overflow-hidden rounded-4xl bg-card-secondary p-8">
      <div className="relative z-10 max-w-xs transition-transform duration-500 ease-out group-hover:scale-105">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-card-primary">
          <Zap className="h-5 w-5 text-neutral-900" />
        </div>
        <h3 className="mb-3 text-xl font-medium leading-tight text-card-foreground md:text-2xl">
          Mantle L2 detectors generic auditors miss
        </h3>
        <p className="text-sm text-card-foreground-muted">
          MNT gas token vs ERC-20 ETH, L1 data-fee accounting, blockhash RNG on L2, PUSH0 / evmVersion, non-Mantle hardcoded addresses.
        </p>
      </div>
    </motion.div>
  );
}

function PRCard(): ReactNode {
  return (
    <motion.div {...cardAnimation} transition={t(0.2)}
      className="group flex min-h-64 flex-col rounded-4xl bg-card-secondary p-6 md:p-8">
      <div className="mb-auto transition-transform duration-500 ease-out group-hover:scale-105">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-card-primary">
          <GitPullRequest className="h-5 w-5 text-neutral-900" />
        </div>
        <h3 className="mb-2 text-xl font-medium leading-tight text-card-foreground md:text-2xl">Validated auto-fix PR</h3>
        <p className="text-sm text-card-foreground-muted">
          Every fix must apply cleanly and compile before it enters the PR. Bad diffs are rejected, never committed.
        </p>
      </div>
      <div className="mt-6 flex items-center gap-2 rounded-xl bg-background p-3">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium text-foreground">git apply ✓ · forge build ✓</span>
      </div>
    </motion.div>
  );
}

function DiskCard(): ReactNode {
  return (
    <motion.div {...cardAnimation} transition={t(0.3)}
      className="group flex min-h-64 flex-col rounded-4xl bg-card-primary p-6 md:p-8">
      <div className="mb-auto transition-transform duration-500 ease-out group-hover:scale-105">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-background">
          <Trash2 className="h-5 w-5 text-neutral-900" />
        </div>
        <h3 className="mb-2 text-xl font-medium leading-tight text-neutral-900 md:text-2xl">Zero disk hoarding</h3>
        <p className="text-sm text-neutral-700">
          Repos are shallow-cloned, audited, then deleted the instant the report is built. PRs use a fresh transient clone.
        </p>
      </div>
      <div className="mt-6 flex items-center gap-2 rounded-xl bg-background p-3">
        <Boxes className="h-4 w-4 text-neutral-900" />
        <span className="text-sm font-medium text-foreground">clone → audit → delete</span>
      </div>
    </motion.div>
  );
}

export function FeaturesBento(): ReactNode {
  return (
    <section id="arsenal" className="mb-32 w-full bg-background px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Built for real audits</h2>
          <p className="mt-2 text-muted-foreground">Not a wrapper — a full orchestration pipeline.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.5fr]">
          <AuditFeedCard />
          <MantleCard />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PRCard />
            <DiskCard />
          </div>
        </div>
      </div>
    </section>
  );
}
