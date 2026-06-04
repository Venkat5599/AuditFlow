// GET /api/branches?url=<repo-url>  ->  { defaultBranch, branches:[{name,sha}] }
// Powers the Target step dropdown. Works for public repos without a token.
import { parseRepoUrl } from "../../../../src/github/github";
import { listBranches } from "../../../../src/github/oauth";

export const runtime = "nodejs";

function cookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return Response.json({ error: "missing url" }, { status: 400 });
  const token = cookie(req, "af_gh_token") ?? process.env.GITHUB_TOKEN ?? undefined;
  try {
    const { owner, name } = parseRepoUrl(url);
    const target = await listBranches(owner, name, token);
    return Response.json(target);
  } catch (e) {
    return Response.json({ error: (e as Error).message, defaultBranch: "main", branches: [] }, { status: 200 });
  }
}
