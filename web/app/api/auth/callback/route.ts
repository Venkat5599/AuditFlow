// GET /api/auth/callback?code&state -> verify state, exchange, set token cookie, redirect home.
import { exchangeCode, verifyState } from "../../../../../src/github/oauth";

export const runtime = "nodejs";

function cookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const saved = cookie(req, "af_oauth_state");

  if (!code || !verifyState(state) || state !== saved) {
    return new Response("Invalid OAuth state", { status: 400 });
  }
  try {
    const token = await exchangeCode(code);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        // 8h session. httpOnly so client JS can't read the token.
        "Set-Cookie": `af_gh_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`,
      },
    });
  } catch (e) {
    return new Response(`OAuth error: ${(e as Error).message}`, { status: 500 });
  }
}
