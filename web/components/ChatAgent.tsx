"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

type Sev = "High" | "Medium" | "Low" | "QA" | "Gas";
type Msg = { role: "user" | "assistant"; content: string; phases?: string[]; summary?: Record<Sev, number> };
type Session = { id: string; title: string; messages: Msg[] };

const SEV_COLOR: Record<Sev, string> = {
  High: "#ef4444", Medium: "#f59e0b", Low: "#3b82f6", QA: "#8b5cf6", Gas: "#10b981",
};
const LS_KEY = "auditflow.chat.sessions";

function load(): Session[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function save(s: Session[]) { localStorage.setItem(LS_KEY, JSON.stringify(s)); }
const uid = () => Math.random().toString(36).slice(2, 10);

export default function ChatAgent() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = load();
    if (s.length === 0) { const n = { id: uid(), title: "New audit chat", messages: [] }; setSessions([n]); setActiveId(n.id); }
    else { setSessions(s); setActiveId(s[0].id); }
  }, []);
  useEffect(() => { if (sessions.length) save(sessions); }, [sessions]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); });

  const active = sessions.find((s) => s.id === activeId);
  const patchActive = (fn: (s: Session) => Session) =>
    setSessions((prev) => prev.map((s) => (s.id === activeId ? fn(s) : s)));
  const newChat = () => { const n = { id: uid(), title: "New audit chat", messages: [] }; setSessions((p) => [n, ...p]); setActiveId(n.id); };
  const delChat = (id: string) =>
    setSessions((p) => { const r = p.filter((s) => s.id !== id); if (id === activeId && r[0]) setActiveId(r[0].id); return r; });

  async function send() {
    if (!input.trim() || busy || !active) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const title = active.messages.length === 0 ? input.trim().slice(0, 40) : active.title;
    const history = [...active.messages, userMsg];
    patchActive((s) => ({ ...s, title, messages: [...history, { role: "assistant", content: "", phases: [] }] }));
    setInput(""); setBusy(true);

    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
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
        patchActive((s) => {
          const ms = [...s.messages]; const a = { ...ms[ms.length - 1] };
          if (msg.type === "status") a.phases = [...(a.phases || []), msg.text];
          if (msg.type === "phase") a.phases = [...(a.phases || []), `${msg.phase}: ${msg.detail}`];
          if (msg.type === "findings") a.summary = msg.summary;
          if (msg.type === "token") a.content += msg.text;
          if (msg.type === "error") a.content += `\n\n⚠️ ${msg.message}`;
          ms[ms.length - 1] = a; return { ...s, messages: ms };
        });
      }
    }
    setBusy(false);
  }

  return (
    <div className="flex h-[76vh] overflow-hidden rounded-3xl border border-border bg-frame">
      {/* sidebar */}
      <aside className="hidden w-60 flex-col border-r border-border bg-muted p-3 sm:flex">
        <button onClick={newChat} className="mb-3 flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background">
          <Plus className="h-4 w-4" /> New chat
        </button>
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sessions</div>
        <div className="mt-2 flex-1 overflow-auto">
          {sessions.map((s) => (
            <div key={s.id} onClick={() => setActiveId(s.id)}
              className="group mb-1 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs"
              style={{ background: s.id === activeId ? "var(--frame)" : "transparent" }}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="flex-1 truncate text-foreground/80">{s.title}</span>
              <button onClick={(e) => { e.stopPropagation(); delChat(s.id); }} className="text-muted-foreground opacity-0 group-hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-muted-foreground">stored locally · this browser</div>
      </aside>

      {/* thread */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-auto p-5">
          {active && active.messages.length === 0 && (
            <div className="mt-10 text-center text-sm text-muted-foreground">
              <div className="mb-2 text-lg font-semibold text-foreground">🛡️ AuditFlow Agent</div>
              Ask about Solidity/Mantle security — or paste a GitHub repo URL and I&apos;ll audit it.
            </div>
          )}
          {active?.messages.map((m, i) => (
            <div key={i} className="mb-5">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide" style={{ color: m.role === "user" ? "#3b82f6" : "#10b981" }}>
                {m.role === "user" ? "You" : "AuditFlow"}
              </div>
              {m.phases && m.phases.length > 0 && (
                <div className="mb-2 rounded-xl border border-border bg-background p-2 font-mono text-[11px] text-muted-foreground">
                  {m.phases.map((p, j) => <div key={j}>› {p}</div>)}
                </div>
              )}
              {m.summary && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {(Object.keys(SEV_COLOR) as Sev[]).map((s) => (
                    <span key={s} className="rounded-lg border border-border bg-muted px-2 py-1 text-[10px]" style={{ color: SEV_COLOR[s] }}>
                      {s} {m.summary![s]}
                    </span>
                  ))}
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {m.content || (busy && i === active.messages.length - 1 ? "…" : "")}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask, or paste a GitHub repo URL to audit…"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring" />
            <button onClick={send} disabled={busy || !input.trim()}
              className="rounded-xl bg-accent px-5 py-3 text-sm font-medium text-card-foreground disabled:opacity-40">
              {busy ? "…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
