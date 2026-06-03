// GET /api/auth/me -> { login, avatar_url } if logged in, else 401.
import { fetchUser } from "../../../../../src/github/oauth";

export const runtime = "nodejs";

function cookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function GET(req: Request) {
  const token = cookie(req, "af_gh_token");
  if (!token) return new Response("unauthorized", { status: 401 });
  try {
    const user = await fetchUser(token);
    return Response.json(user);
  } catch {
    return new Response("unauthorized", { status: 401 });
  }
}
