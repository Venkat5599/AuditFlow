// GitHub OAuth helpers (web flow). Token is stored in an httpOnly cookie by the routes.
import { createHmac, randomBytes } from "node:crypto";

const CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? "";
const CALLBACK = process.env.GITHUB_CALLBACK_URL ?? "http://localhost:3000/api/auth/callback";
const STATE_SECRET = process.env.AUDITFLOW_STATE_SECRET ?? "dev-insecure-secret";
const SCOPES = "repo read:user"; // repo => clone private + push fix branch + open PR

export function authorizeUrl(): { url: string; state: string } {
  const nonce = randomBytes(16).toString("hex");
  const sig = createHmac("sha256", STATE_SECRET).update(nonce).digest("hex").slice(0, 16);
  const state = `${nonce}.${sig}`;
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", CALLBACK);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  return { url: url.toString(), state };
}

export function verifyState(state: string | null): boolean {
  if (!state) return false;
  const [nonce, sig] = state.split(".");
  if (!nonce || !sig) return false;
  const expect = createHmac("sha256", STATE_SECRET).update(nonce).digest("hex").slice(0, 16);
  return expect === sig;
}

export async function exchangeCode(code: string): Promise<string> {
  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code, redirect_uri: CALLBACK }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`OAuth exchange failed: ${j.error_description ?? JSON.stringify(j)}`);
  return j.access_token as string;
}

export async function fetchUser(token: string): Promise<{ login: string; avatar_url: string }> {
  const r = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  const j = await r.json();
  return { login: j.login, avatar_url: j.avatar_url };
}

export interface RepoInfo { name: string; full_name: string; html_url: string; private: boolean; language: string | null; pushed_at: string; }

// List the authenticated user's repos (most recently pushed first).
export async function listUserRepos(token: string): Promise<RepoInfo[]> {
  const r = await fetch("https://api.github.com/user/repos?per_page=100&sort=pushed&affiliation=owner", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!r.ok) return [];
  const j = (await r.json()) as any[];
  return j.map((x) => ({ name: x.name, full_name: x.full_name, html_url: x.html_url, private: x.private, language: x.language, pushed_at: x.pushed_at }));
}

// GitHub REST helper — token optional (public repos work unauthenticated, just rate-limited).
function gh(path: string, token?: string) {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`https://api.github.com${path}`, { headers });
}

export interface BranchInfo { name: string; sha: string; }
export interface RepoTarget { defaultBranch: string; branches: BranchInfo[]; }

// List a repo's branches + its default branch (for the Target step dropdown).
export async function listBranches(owner: string, name: string, token?: string): Promise<RepoTarget> {
  const meta = await gh(`/repos/${owner}/${name}`, token);
  const defaultBranch = meta.ok ? ((await meta.json()) as any).default_branch ?? "main" : "main";
  const br = await gh(`/repos/${owner}/${name}/branches?per_page=100`, token);
  const branches: BranchInfo[] = br.ok
    ? ((await br.json()) as any[]).map((b) => ({ name: b.name, sha: b.commit?.sha ?? "" }))
    : [];
  return { defaultBranch, branches };
}

// List every .sol file at a given ref via the git-tree API (no clone needed).
export async function listSolFiles(owner: string, name: string, ref: string, token?: string): Promise<string[]> {
  const r = await gh(`/repos/${owner}/${name}/git/trees/${encodeURIComponent(ref)}?recursive=1`, token);
  if (!r.ok) return [];
  const j = (await r.json()) as any;
  return (j.tree ?? [])
    .filter((t: any) => t.type === "blob" && typeof t.path === "string" && t.path.endsWith(".sol"))
    .map((t: any) => t.path as string)
    .sort();
}

// Fetch a single file's text at a ref via the contents API (no clone).
export async function getFileContent(owner: string, name: string, path: string, ref: string, token?: string): Promise<string> {
  const r = await gh(`/repos/${owner}/${name}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`, token);
  if (!r.ok) throw new Error(`file fetch failed (${r.status})`);
  const j = (await r.json()) as any;
  if (typeof j.content === "string" && j.encoding === "base64") {
    return Buffer.from(j.content, "base64").toString("utf8");
  }
  throw new Error("unsupported file response");
}
