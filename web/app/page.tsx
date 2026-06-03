import Aurora from "../components/reactbits/Aurora";
import GradientText from "../components/reactbits/GradientText";
import ShinyText from "../components/reactbits/ShinyText";
import SpotlightCard from "../components/reactbits/SpotlightCard";
import CountUp from "../components/reactbits/CountUp";
import AnimatedContent from "../components/reactbits/AnimatedContent";
import AuditApp from "../components/AuditApp";

const STEPS = [
  { n: "01", t: "Connect & paste", d: "OAuth your GitHub, drop a repo URL. No setup." },
  { n: "02", t: "Smart routing", d: "Signals in your contracts pick the relevant auditors — not all 39." },
  { n: "03", t: "Parallel audit", d: "Slither + Aderyn + LLM skills + Mantle-specific detectors run together." },
  { n: "04", t: "C4 report + auto-PR", d: "Code4rena-style findings. Validated fixes open as a PR." },
];

const STATS = [
  { v: 39, s: "+", l: "Security tools orchestrated" },
  { v: 7, s: "", l: "Mantle-specific detectors" },
  { v: 5, s: "", l: "Severity tiers (H/M/L/QA/Gas)" },
  { v: 100, s: "%", l: "Validated diffs before PR" },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <Aurora />

      {/* nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-bold">
          <span className="text-xl">🛡️</span>
          <span>Audit<GradientText>Flow</GradientText></span>
        </div>
        <a href="https://dorahacks.io" className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm text-white/70 transition hover:text-white">
          Mantle · Turing Test 2026
        </a>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-10 pt-16 text-center">
        <AnimatedContent>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white/5 px-4 py-1.5 text-xs text-white/60">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5eead4]" />
            <ShinyText text="Track 05 · AI DevTools · agent-orchestrated auditing" />
          </div>
        </AnimatedContent>

        <AnimatedContent delay={0.08}>
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">
            Audit any Solidity repo.<br />
            <GradientText>Ship the fixes.</GradientText>
          </h1>
        </AnimatedContent>

        <AnimatedContent delay={0.16}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/55">
            Connect GitHub, paste a repo. AuditFlow routes it through 39 security tools,
            writes a Code4rena-style report, and opens a validated auto-fix PR — built for Mantle.
          </p>
        </AnimatedContent>

        <AnimatedContent delay={0.24}>
          <div className="mt-8 flex justify-center gap-3">
            <a href="#app" className="rounded-lg bg-gradient-to-r from-[#5eead4] to-[#818cf8] px-7 py-3 font-semibold text-black transition hover:opacity-90">
              Run an audit
            </a>
            <a href="#how" className="rounded-lg border border-[var(--color-line)] px-7 py-3 font-medium text-white/80 transition hover:bg-white/5">
              How it works
            </a>
          </div>
        </AnimatedContent>
      </section>

      {/* stats */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-12">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map((st, i) => (
            <AnimatedContent key={st.l} delay={i * 0.06}>
              <div className="glass rounded-2xl p-5 text-center">
                <div className="text-3xl font-bold text-white">
                  <CountUp to={st.v} suffix={st.s} />
                </div>
                <div className="mt-1 text-xs text-white/50">{st.l}</div>
              </div>
            </AnimatedContent>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        <AnimatedContent>
          <h2 className="mb-10 text-center text-3xl font-bold sm:text-4xl">
            From repo to PR in <GradientText>four steps</GradientText>
          </h2>
        </AnimatedContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <AnimatedContent key={step.n} delay={i * 0.08}>
              <SpotlightCard className="h-full">
                <div className="mb-3 font-mono text-sm text-[#5eead4]">{step.n}</div>
                <h3 className="mb-2 font-semibold text-white">{step.t}</h3>
                <p className="text-sm text-white/55">{step.d}</p>
              </SpotlightCard>
            </AnimatedContent>
          ))}
        </div>
      </section>

      {/* the app */}
      <section id="app" className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <AnimatedContent>
          <h2 className="mb-3 text-center text-3xl font-bold sm:text-4xl">Try it now</h2>
          <p className="mb-10 text-center text-white/50">Paste a Solidity repo. Watch the orchestration run live.</p>
        </AnimatedContent>
        <AuditApp />
      </section>

      {/* footer */}
      <footer className="relative z-10 mx-auto max-w-6xl px-6 py-10 text-center text-sm text-white/40">
        Built on Mantle · The Turing Test Hackathon 2026 · AuditFlow
      </footer>
    </main>
  );
}
