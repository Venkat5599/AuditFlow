// In-memory audit session store so triage can run a PR over an already-cloned repo.
// Sessions hold the live clone path + report; evicted after TTL to free tmp dirs.
import { rmSync } from "node:fs";
import { randomBytes } from "node:crypto";
import type { AuditReport } from "../types";

interface Session { report: AuditReport; createdAt: number; }

const TTL_MS = 30 * 60_000;
const store = new Map<string, Session>();

function sweep() {
  const now = Date.now();
  for (const [id, s] of store) {
    if (now - s.createdAt > TTL_MS) {
      try { rmSync(s.report.repo.localPath, { recursive: true, force: true }); } catch {}
      store.delete(id);
    }
  }
}

export function saveSession(report: AuditReport): string {
  sweep();
  const id = randomBytes(12).toString("hex");
  store.set(id, { report, createdAt: Date.now() });
  return id;
}

export function getSession(id: string): AuditReport | null {
  sweep();
  return store.get(id)?.report ?? null;
}

export function dropSession(id: string) {
  const s = store.get(id);
  if (s) { try { rmSync(s.report.repo.localPath, { recursive: true, force: true }); } catch {} }
  store.delete(id);
}
