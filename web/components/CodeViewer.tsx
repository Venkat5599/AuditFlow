"use client";
import { useEffect, useState, type ReactNode } from "react";
import { FileCode2, Loader2 } from "lucide-react";

// VSCode-dark colours.
const C = {
  bg: "#1e1e1e", gutter: "#858585", text: "#d4d4d4",
  comment: "#6a9955", keyword: "#c586c0", decl: "#569cd6", type: "#4ec9b0",
  string: "#ce9178", number: "#b5cea8", fn: "#dcdcaa",
};

const KW = new Set(["pragma","import","contract","interface","library","is","using","function","modifier","event","error","struct","enum","mapping","return","returns","if","else","for","while","do","break","continue","require","revert","assert","emit","new","delete","try","catch","assembly","unchecked","constructor","fallback","receive","abstract","virtual","override","constant","immutable","payable","view","pure","memory","storage","calldata","public","private","internal","external","indexed","anonymous"]);
const TY = new Set(["address","bool","string","bytes","byte","uint","int","uint8","uint16","uint32","uint64","uint128","uint256","int8","int128","int256","bytes1","bytes4","bytes8","bytes20","bytes32","mapping","wei","gwei","ether","seconds","minutes","hours","days","weeks"]);

type Tok = { t: string; c?: string };

// Tokenize one line; `inBlock` tracks multiline /* */ state across lines.
function tokenizeLine(line: string, inBlock: boolean): { toks: Tok[]; inBlock: boolean } {
  const toks: Tok[] = [];
  let i = 0;
  if (inBlock) {
    const end = line.indexOf("*/");
    if (end === -1) return { toks: [{ t: line, c: C.comment }], inBlock: true };
    toks.push({ t: line.slice(0, end + 2), c: C.comment }); i = end + 2; inBlock = false;
  }
  while (i < line.length) {
    const rest = line.slice(i);
    if (rest.startsWith("//")) { toks.push({ t: rest, c: C.comment }); break; }
    if (rest.startsWith("/*")) {
      const end = rest.indexOf("*/");
      if (end === -1) { toks.push({ t: rest, c: C.comment }); inBlock = true; break; }
      toks.push({ t: rest.slice(0, end + 2), c: C.comment }); i += end + 2; continue;
    }
    const ch = line[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1; while (j < line.length && line[j] !== ch) { if (line[j] === "\\") j++; j++; }
      toks.push({ t: line.slice(i, j + 1), c: C.string }); i = j + 1; continue;
    }
    if (/[0-9]/.test(ch)) {
      const m = rest.match(/^(0x[0-9a-fA-F]+|[0-9_]+(\.[0-9]+)?(e[0-9]+)?)/);
      const t = m ? m[0] : ch; toks.push({ t, c: C.number }); i += t.length; continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      const m = rest.match(/^[A-Za-z_$][A-Za-z0-9_$]*/)!;
      const w = m[0];
      const after = line.slice(i + w.length).trimStart();
      const c = KW.has(w) ? C.keyword : TY.has(w) ? C.type : after.startsWith("(") ? C.fn : C.text;
      toks.push({ t: w, c }); i += w.length; continue;
    }
    toks.push({ t: ch, c: C.text }); i++;
  }
  return { toks, inBlock };
}

function highlight(code: string): ReactNode[] {
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  let inBlock = false;
  return lines.map((ln, idx) => {
    const { toks, inBlock: nb } = tokenizeLine(ln, inBlock); inBlock = nb;
    return (
      <div key={idx} className="flex">
        <span className="select-none pr-4 text-right" style={{ color: C.gutter, minWidth: "3.25rem" }}>{idx + 1}</span>
        <code className="whitespace-pre">
          {toks.length === 0 ? " " : toks.map((tk, k) => <span key={k} style={{ color: tk.c }}>{tk.t}</span>)}
        </code>
      </div>
    );
  });
}

export default function CodeViewer({ url, refName, path }: { url: string; refName: string; path: string | null }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!path) { setContent(""); return; }
    setLoading(true); setErr(""); setContent("");
    fetch(`/api/file?url=${encodeURIComponent(url)}&ref=${encodeURIComponent(refName || "HEAD")}&path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((j) => { if (j.content) setContent(j.content); else setErr(j.error || "empty"); })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [url, refName, path]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg" style={{ background: C.bg }}>
      {/* editor tab bar */}
      <div className="flex items-center gap-2 border-b px-3 py-1.5" style={{ borderColor: "#2d2d2d" }}>
        <FileCode2 className="h-3.5 w-3.5" style={{ color: "#519aba" }} />
        <span className="font-mono text-xs" style={{ color: path ? C.text : C.gutter }}>{path ? path.split("/").pop() : "no file selected"}</span>
        {path && <span className="ml-auto font-mono text-[10px]" style={{ color: C.gutter }}>{path}</span>}
      </div>
      {/* body */}
      <div className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-[1.55]">
        {!path && <div className="flex h-full items-center justify-center text-xs" style={{ color: C.gutter }}>Select a contract to view its source</div>}
        {loading && <div className="flex items-center gap-2 text-xs" style={{ color: C.gutter }}><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</div>}
        {err && !loading && <div className="text-xs" style={{ color: "#f48771" }}>Could not load file: {err}</div>}
        {!loading && content && <div>{highlight(content)}</div>}
      </div>
    </div>
  );
}
