// POST or GET /api/auth/logout -> clear the session cookie.
export const runtime = "nodejs";

function clear() {
  return new Response(null, {
    status: 302,
    headers: { Location: "/", "Set-Cookie": "af_gh_token=; Path=/; HttpOnly; Max-Age=0" },
  });
}
export const GET = clear;
export const POST = clear;
