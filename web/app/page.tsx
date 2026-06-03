import CountUp from "../components/reactbits/CountUp";
import AnimatedContent from "../components/reactbits/AnimatedContent";
import AuditApp from "../components/AuditApp";

const STATS = [
  { v: 31, s: "", l: "AUDIT SKILLS", c: "var(--green)" },
  { v: 11, s: "", l: "QUILLAI DETECTORS", c: "var(--blue)" },
  { v: 7, s: "", l: "MANTLE DETECTORS", c: "var(--amber)" },
  { v: 5, s: "", l: "SEVERITY TIERS", c: "var(--purple)" },
];

const TOOLS = [
  { name: "SLITHER", desc: "Static detectors — reentrancy, access control, uninitialized state.", c: "var(--blue)", kind: "ANALYZER" },
  { name: "ADERYN", desc: "Rust-based Solidity AST analyzer, best-practice + detectors.", c: "var(--blue)", kind: "ANALYZER" },
  { name: "PASHOV · VECTOR-SCAN", desc: "Attack-vector sweep across the pashov solidity-auditor checklist.", c: "var(--green)", kind: "LLM SKILL" },
  { name: "PASHOV · ACCESS-CONTROL", desc: "Ownership, roles, privilege escalation, missing guards.", c: "var(--green)", kind: "LLM SKILL" },
  { name: "PASHOV · MATH-PRECISION", desc: "Rounding, overflow, share/asset accounting drift.", c: "var(--green)", kind: "LLM SKILL" },
  { name: "MANTLE DETECTORS", desc: "L2 semantics: MNT gas vs ERC-20 ETH, blockhash RNG, PUSH0, L1 data fee.", c: "var(--amber)", kind: "MANTLE" },
];

const STEPS = [
  { n: "01", t: "CONNECT & PASTE", d: "OAuth GitHub, drop a repo URL. Zero setup." },
  { n: "02", t: "SIGNAL ROUTING", d: "Contract signals pick the relevant auditors — not all 39." },
  { n: "03", t: "PARALLEL AUDIT", d: "Static + pashov LLM agents + Mantle detectors, together." },
  { n: "04", t: "REPORT + AUTO-PR", d: "C4-style findings. Validated fixes open as a PR." },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="grid-bg" />

      {/* nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-sm font-bold tracking-widest">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--green)", boxShadow: "0 0 10px var(--green)" }} />
          AUDIT<span style={{ color: "var(--t3)" }}>FLOW</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/chat" className="rounded px-3 py-1.5 text-[11px] font-bold tracking-widest" style={{ background: "var(--accent)", color: "var(--s0)" }}>
            💬 AGENT CHAT
          </a>
          <span className="hidden rounded border px-3 py-1.5 text-[11px] tracking-widest sm:inline" style={{ borderColor: "var(--b2)", color: "var(--t2)" }}>
            MANTLE · TRACK 05
          </span>
        </div>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-8 pt-16 text-center">
        <AnimatedContent>
          <div className="hero-stack">
            <span className="hero-thin">AGENT-ORCHESTRATED</span>
            <span className="hero-big cursor-blink">AUDIT ENGINE</span>
            <span className="hero-thin">FOR MANTLE</span>
          </div>
        </AnimatedContent>
        <AnimatedContent delay={0.15}>
          <p className="mx-auto mt-8 max-w-2xl text-sm leading-relaxed tracking-wide" style={{ color: "var(--t2)" }}>
            Connect GitHub, paste a Solidity repo. AuditFlow routes it through 39 security tools
            and the pashov agent suite, writes a Code4rena-style report, and opens a validated
            auto-fix PR — with Mantle L2 detectors generic auditors miss.
          </p>
        </AnimatedContent>
        <AnimatedContent delay={0.25}>
          <div className="mt-8 flex justify-center gap-3 text-xs tracking-widest">
            <a href="#app" className="rounded px-6 py-3 font-bold" style={{ background: "var(--accent)", color: "var(--s0)" }}>RUN AN AUDIT →</a>
            <a href="#how" className="rounded border px-6 py-3" style={{ borderColor: "var(--b2)", color: "var(--t1)" }}>HOW IT WORKS</a>
          </div>
        </AnimatedContent>
      </section>

      {/* stats */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map((st, i) => (
            <AnimatedContent key={st.l} delay={i * 0.06}>
              <div className="panel stripe relative p-5 text-center" style={{ ["--stripe" as string]: st.c }}>
                <div className="text-3xl font-black" style={{ color: st.c }}><CountUp to={st.v} suffix={st.s} /></div>
                <div className="mt-1.5 text-[10px] tracking-widest" style={{ color: "var(--t3)" }}>{st.l}</div>
              </div>
            </AnimatedContent>
          ))}
        </div>
      </section>

      {/* tools grid */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-14">
        <AnimatedContent><div className="sec-title mb-8">THE ARSENAL</div></AnimatedContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t, i) => (
            <AnimatedContent key={t.name} delay={i * 0.05}>
              <div className="panel tool-card stripe h-full p-5" style={{ ["--stripe" as string]: t.c }}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] tracking-widest" style={{ color: t.c }}>{t.kind}</span>
                </div>
                <h3 className="mb-2 text-sm font-bold tracking-wide" style={{ color: "var(--t1)" }}>{t.name}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--t2)" }}>{t.desc}</p>
              </div>
            </AnimatedContent>
          ))}
        </div>
      </section>

      {/* how */}
      <section id="how" className="relative z-10 mx-auto max-w-6xl px-6 py-14">
        <AnimatedContent><div className="sec-title mb-8">PIPELINE</div></AnimatedContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <AnimatedContent key={s.n} delay={i * 0.07}>
              <div className="panel h-full p-5">
                <div className="mb-3 font-mono text-2xl font-black" style={{ color: "var(--t4)" }}>{s.n}</div>
                <h3 className="mb-2 text-xs font-bold tracking-widest" style={{ color: "var(--t1)" }}>{s.t}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--t2)" }}>{s.d}</p>
              </div>
            </AnimatedContent>
          ))}
        </div>
      </section>

      {/* app */}
      <section id="app" className="relative z-10 mx-auto max-w-6xl px-6 py-14">
        <AnimatedContent><div className="sec-title mb-8">LIVE AUDIT</div></AnimatedContent>
        <AuditApp />
      </section>

      <footer className="relative z-10 mx-auto max-w-6xl px-6 py-10 text-center text-[11px] tracking-widest" style={{ color: "var(--t4)" }}>
        BUILT ON MANTLE · THE TURING TEST HACKATHON 2026 · AUDITFLOW
      </footer>
    </main>
  );
}
