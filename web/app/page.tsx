import AuditApp from "@/components/AuditApp";
import { Reveal } from "@/components/reveal";
import { heroConfig } from "@/lib/config";
import { ArrowDownRight, ShieldCheck, GitPullRequest, Boxes, Cpu } from "lucide-react";

const STATS = [
  { v: "31", l: "Audit skills" },
  { v: "11", l: "QuillAI detectors" },
  { v: "7", l: "Mantle detectors" },
  { v: "5", l: "Severity tiers" },
];

const TOOLS = [
  { icon: Cpu, name: "Static analyzers", d: "Slither + Aderyn — deterministic, high-confidence detectors." },
  { icon: ShieldCheck, name: "pashov agents", d: "8 specialist auditors: vectors, access control, math, economics." },
  { icon: Boxes, name: "QuillAI + nemesis", d: "Reentrancy, oracle/flash-loan, proxy, arithmetic, DoS, replay." },
  { icon: GitPullRequest, name: "Mantle detectors", d: "L2 semantics generic auditors miss: MNT gas, blockhash RNG, PUSH0." },
];

const STEPS = [
  { n: "01", t: "Connect & paste", d: "OAuth GitHub, drop a repo URL. Zero setup." },
  { n: "02", t: "Signal routing", d: "Contract signals pick the relevant auditors — not all 31 blindly." },
  { n: "03", t: "Parallel audit", d: "Static + LLM agents + Mantle detectors run together, deduped." },
  { n: "04", t: "Report + auto-PR", d: "C4-style findings. Validated fixes open as a PR. Clones auto-deleted." },
];

export default function Home() {
  return (
    <main id="main" className="px-4">
      {/* hero */}
      <section className="mx-auto flex max-w-4xl flex-col items-center pt-40 pb-16 text-center max-[850px]:pt-32">
        <Reveal>
          <span className="mb-6 inline-block rounded-full border border-border bg-frame px-4 py-1.5 text-xs font-medium text-muted-foreground">
            {heroConfig.badge}
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            {heroConfig.headline.line1}<br />
            {heroConfig.headline.line2}{" "}
            <span className="rounded-2xl bg-accent px-3 text-card-foreground">{heroConfig.headline.accent}</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{heroConfig.subheadline}</p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-8 flex gap-3">
            <a href="#audit" className="group relative inline-flex items-center">
              <span className="absolute inset-y-0 right-0 w-[calc(100%-1.5rem)] rounded-xl bg-accent" />
              <span className="relative z-10 rounded-xl bg-foreground px-6 py-3 text-sm font-medium text-background">Run an audit</span>
              <span className="relative -left-px z-10 flex h-10 w-10 items-center justify-center rounded-xl text-black">
                <ArrowDownRight className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-45" />
              </span>
            </a>
            <a href="/chat" className="rounded-xl border border-border bg-frame px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              Talk to the agent
            </a>
          </div>
        </Reveal>
      </section>

      {/* stats */}
      <section className="mx-auto max-w-5xl pb-20">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.l} delay={i * 0.06}>
              <div className="rounded-2xl border border-border bg-frame p-6 text-center">
                <div className="text-4xl font-semibold tracking-tight">{s.v}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* arsenal bento */}
      <section id="arsenal" className="mx-auto max-w-5xl pb-20">
        <Reveal><h2 className="mb-8 text-3xl font-semibold tracking-tight">The arsenal</h2></Reveal>
        <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.06}>
              <div className="h-full rounded-3xl border border-border bg-frame p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-card-secondary">
                  <t.icon className="h-5 w-5 text-card-foreground" />
                </div>
                <h3 className="mb-1.5 font-semibold">{t.name}</h3>
                <p className="text-sm text-muted-foreground">{t.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="mx-auto max-w-5xl pb-20">
        <Reveal><h2 className="mb-8 text-3xl font-semibold tracking-tight">From repo to PR</h2></Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.06}>
              <div className="h-full rounded-3xl border border-border bg-frame p-6">
                <div className="mb-3 font-mono text-2xl font-semibold text-muted-foreground">{s.n}</div>
                <h3 className="mb-1.5 font-semibold">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* the app */}
      <section id="audit" className="mx-auto max-w-4xl pb-24">
        <Reveal>
          <h2 className="mb-2 text-3xl font-semibold tracking-tight">Try it now</h2>
          <p className="mb-8 text-muted-foreground">Paste a Solidity repo. Watch the orchestration run live.</p>
        </Reveal>
        <AuditApp />
      </section>

      <footer className="mx-auto max-w-5xl border-t border-border py-10 text-center text-sm text-muted-foreground">
        Built on Mantle · The Turing Test Hackathon 2026 · AuditFlow
      </footer>
    </main>
  );
}
