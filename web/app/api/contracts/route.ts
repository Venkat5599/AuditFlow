// GET /api/contracts?url=<repo-url>&ref=<branch|tag|sha>  ->  { files: string[] }
// Lists every .sol path at a ref via the git-tree API (no clone). Powers the
// "Choose contracts manually" scope picker.
import { parseRepoUrl } from "../../../../src/github/github";
import { listSolFiles } from "../../../../src/github/oauth";

export const runtime = "nodejs";

function cookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const url = sp.get("url");
  const ref = sp.get("ref") ?? "HEAD";
  if (!url) return Response.json({ error: "missing url" }, { status: 400 });
  const token = cookie(req, "af_gh_token") ?? process.env.GITHUB_TOKEN ?? undefined;
  try {
    const { owner, name } = parseRepoUrl(url);
    const files = await listSolFiles(owner, name, ref, token);
    return Response.json({ files });
  } catch (e) {
    return Response.json({ error: (e as Error).message, files: [] }, { status: 200 });
  }
}
