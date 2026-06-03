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
