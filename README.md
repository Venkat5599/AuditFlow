# AuditFlow 🛡️

Agent-orchestrated Solidity/EVM security auditing for the **Mantle Turing Test Hackathon 2026 — Track 05 (AI DevTools)**.

Connect a GitHub repo → AuditFlow routes it to the relevant auditors from this 39-tool security hub, runs them, produces a **Code4rena-style report**, and opens an **auto-fix PR** on the connected repo.

## Flow

```
GitHub URL ──▶ clone ──▶ detect (.sol + framework)
           ──▶ route (signal-based tool selection)
           ──▶ audit:  static analyzers (slither, aderyn)  +  LLM skills (OpenCode + DeepSeek-free)
           ──▶ dedupe + C4 report
           ──▶ open auto-fix PR (applies suggestedDiff patches)
```

## Why it is not "run all 39 tools"

`src/routing/router.ts` scans contract bodies for signals (reentrancy, access-control,
oracle, proxy, accounting) and picks the **top-N relevant** skills + both static analyzers.
Move/Rust/mobile skills in the hub are out of scope (Solidity/EVM only).

## Run (CLI)

```bash
bun install
cp .env.example .env   # set DEEPSEEK_API_KEY and GITHUB_TOKEN
bun run audit https://github.com/owner/repo --pr
```

## Run (web)

```bash
bun run web    # http://localhost:3000
```

## Engine

Default engine = **OpenCode CLI** with the free **DeepSeek** model
(`AUDITFLOW_MODEL=deepseek/deepseek-chat`). If `opencode` is not installed,
it falls back to the DeepSeek REST API (`DEEPSEEK_API_KEY`).

Static analyzers (`slither`, `aderyn`) run if present on PATH — they give a
deterministic, high-confidence baseline that the LLM findings are deduped against.

## Layout

| Path | Role |
|---|---|
| `src/orchestrator/pipeline.ts` | spine: clone→detect→route→audit→report→PR |
| `src/routing/` | tool registry + signal-based relevance router |
| `src/engine/` | OpenCode/DeepSeek skill engine + slither/aderyn analyzers |
| `src/report/` | dedupe + C4-style markdown |
| `src/github/` | clone + auto-fix PR (Octokit) |
| `web/` | Next.js UI + SSE audit API |

## Web flow (with triage)

1. **Connect GitHub** — OAuth (`/api/auth/github`), token stored in an httpOnly cookie.
2. **Run audit** — `/api/audit` streams progress (SSE), returns findings + a session id.
3. **Triage** — pick which fixes go in the PR (auto-fixable findings pre-selected).
4. **Create PR** — `/api/pr` validates each chosen diff (apply + compile gate) then opens it.

## Mantle integration

- `src/mantle/detectors.ts` — Mantle/L2-specific findings generic auditors miss
  (MNT gas token vs ERC-20 ETH, L1 data-fee gas accounting, blockhash RNG on L2,
  PUSH0/evmVersion, hardcoded non-Mantle addresses). Always runs.
- `contracts/AuditRegistry.sol` — on-chain attestation registry. Each audit records
  `(repoId, reportHash, H/M/L, auditor)` on Mantle so reports are tamper-evident.
  Deploy: `forge script script/Deploy.s.sol --rpc-url mantle_sepolia --broadcast`.
- `src/chain/attest.ts` — viem publisher (env-gated by `AUDITFLOW_REGISTRY` + key).

## Validation gate

`src/github/validate.ts` — before any diff enters a PR it must (1) `git apply --check`
and (2) compile (`forge build` / `hardhat compile`) on an isolated copy. Rejected fixes
are reported in the PR body but never committed, so auto-PRs never break the build.

## Deploy

- Web: `docker build -t auditflow . && docker run -p 3000:3000 --env-file .env auditflow`
- Contracts: see `contracts/` (Foundry, EVM target pinned to `paris` for Mantle).

## Status

All five milestones complete: OAuth · diff-validation · Mantle detectors · triage UI · on-chain attestation.
Typechecks clean. Remaining for Demo Day polish: Mantle testnet deploy of the registry,
richer diff preview in triage, rate-limiting.
