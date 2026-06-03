import ChatAgent from "../../components/ChatAgent";

export default function ChatPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="grid-bg" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="/" className="flex items-center gap-2 text-sm font-bold tracking-widest">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--green)", boxShadow: "0 0 10px var(--green)" }} />
          AUDIT<span style={{ color: "var(--t3)" }}>FLOW</span>
        </a>
        <a href="/" className="rounded border px-3 py-1.5 text-[11px] tracking-widest" style={{ borderColor: "var(--b2)", color: "var(--t2)" }}>
          ← BACK TO AUDIT
        </a>
      </header>
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-10">
        <div className="sec-title mb-6">AGENT · TALK TO AUDITFLOW</div>
        <ChatAgent />
      </section>
    </main>
  );
}
