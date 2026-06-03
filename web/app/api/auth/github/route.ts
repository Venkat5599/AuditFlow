// GET /api/auth/github -> redirect to GitHub consent screen.
import { authorizeUrl } from "../../../../../src/github/oauth";

export const runtime = "nodejs";

export async function GET() {
  const { url, state } = authorizeUrl();
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Set-Cookie": `af_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    },
  });
}
