// GET /api/repos -> the connected user's repos (for the picker + name resolution).
import { listUserRepos } from "../../../../src/github/oauth";

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
    const repos = await listUserRepos(token);
    return Response.json({ repos });
  } catch {
    return Response.json({ repos: [] });
  }
}
