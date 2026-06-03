import ChatAgent from "@/components/ChatAgent";

export default function ChatPage() {
  return (
    <main id="main" className="mx-auto max-w-6xl px-4 pt-32 pb-12 max-[850px]:pt-28">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Agent</h1>
      <p className="mb-6 text-muted-foreground">Talk to AuditFlow — ask security questions or paste a repo to audit.</p>
      <ChatAgent />
    </main>
  );
}
