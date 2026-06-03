// GET /api/auth/callback?code&state -> CSRF-check via state cookie, exchange, set token, back to dashboard.
import { exchangeCode } from "../../../../../src/github/oauth";

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

  // CSRF protection = the state param must equal the cookie we set (both present).
  // (HMAC verification dropped — too fragile across redeploys; cookie binding suffices.)
  if (!code || !state || state !== saved) {
    return new Response("Invalid OAuth state — please click Connect GitHub again.", { status: 400 });
  }
  try {
    const token = await exchangeCode(code);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/dashboard",
        "Set-Cookie": `af_gh_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`,
      },
    });
  } catch (e) {
    return new Response(`OAuth error: ${(e as Error).message}`, { status: 500 });
  }
}
