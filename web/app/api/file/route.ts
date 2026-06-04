// GET /api/file?url=<repo-url>&ref=<branch|tag|sha>&path=<rel/path.sol>  ->  { content }
// Raw file text via the GitHub contents API (no clone). Powers the code viewer.
import { parseRepoUrl } from "../../../../src/github/github";
import { getFileContent } from "../../../../src/github/oauth";

export const runtime = "nodejs";

function cookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const url = sp.get("url");
  const path = sp.get("path");
  const ref = sp.get("ref") ?? "HEAD";
  if (!url || !path) return Response.json({ error: "missing url or path" }, { status: 400 });
  const token = cookie(req, "af_gh_token") ?? process.env.GITHUB_TOKEN ?? undefined;
  try {
    const { owner, name } = parseRepoUrl(url);
    const content = await getFileContent(owner, name, path, ref, token);
    return Response.json({ content });
  } catch (e) {
    return Response.json({ error: (e as Error).message, content: "" }, { status: 200 });
  }
}
