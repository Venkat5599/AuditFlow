<p align="center">
  <img src="https://img.shields.io/badge/🛡️-AuditFlow-22C55E?style=for-the-badge&labelColor=0a0f12" alt="AuditFlow" />
</p>

<h1 align="center">AuditFlow</h1>

<p align="center">
  <strong>Agent-Orchestrated Solidity Security Auditing for Mantle — Repo In, Auto-Fix PR Out</strong>
</p>

<p align="center">
  <a href="https://auditflow-theta.vercel.app">
    <img src="https://img.shields.io/badge/🟢_LIVE-auditflow--theta.vercel.app-22C55E?style=for-the-badge" alt="Live App" />
  </a>
  <img src="https://img.shields.io/badge/Mantle-Turing_Test_2026-000000?style=for-the-badge" alt="Mantle Turing Test 2026" />
  <img src="https://img.shields.io/badge/Track_05-AI_DevTools-22C55E?style=for-the-badge" alt="Track 05" />
  <img src="https://img.shields.io/badge/Solidity-EVM-363636?style=for-the-badge&logo=solidity" alt="Solidity" />
</p>

---

## 📋 Project Overview

**AuditFlow** is an agent-orchestrated security auditor for Solidity / EVM code. You connect a GitHub repo (or paste a public URL); AuditFlow clones it, routes it through **31 audit tools** plus Mantle L2-specific detectors, grades the findings into a **Code4rena-style report**, and opens a **validated auto-fix pull request** on the repo.

### What It Does

- **Routes by signal** - scans contracts for risk signals (reentrancy, access-control, oracle, accounting, proxy) and runs only the relevant tools, not all of them blindly
- **Dual-layer analysis** - deterministic static analyzers (Slither, Aderyn) plus LLM-driven security detectors, deduped against each other
- **Mantle-aware** - L2 detectors catch issues generic auditors miss (MNT-vs-ERC20 gas token, L1 data-fee accounting, blockhash RNG on L2, PUSH0/evmVersion, hardcoded non-Mantle addresses)
- **Graded report** - High / Medium / Low / QA / Gas, Code4rena format
- **Validated auto-fix PR** - generates a fix, proves it applies and compiles, then opens the PR. Rejected fixes never touch the build

### Key Innovation

Most "AI auditors" emit a wall of text. AuditFlow closes the loop: **repo in → audit → fix → PR out**, fully automated. Fixes aren't trusted hand-written diffs - the model rewrites the full file and the patch is derived via `git diff`, so every fix is **guaranteed to apply** and is **gated through compile before it ships**.

```
Typical AI auditor:  Repo → LLM → wall of findings (you fix it yourself)
AuditFlow:           Repo → route → audit → generate fix → validate → auto-PR
```

---

## 🌐 Why This Matters for Mantle

### Track 05 — AI DevTools

Mantle's Turing Test hackathon Track 05 is about **AI tools that make building on Mantle faster and safer**. Security auditing is the bottleneck between writing a contract and shipping it - slow, expensive, and manual.

### What AuditFlow Brings to Mantle

| Benefit | Impact |
|---------|--------|
| **Ships fixes, not just findings** | Developers get a reviewable PR, not a 40-page PDF they have to act on |
| **Mantle-native checks** | L2 detectors built specifically for Mantle's gas model and EVM target |
| **Lowers the audit barrier** | Free engine (DeepSeek via OpenCode Zen) - any Mantle dev can audit before deploy |
| **On-chain attestation** | Every audit can record a tamper-evident proof on Mantle (`AuditRegistry.sol`) |

### Market Need

- Mantle devs deploying Solidity need a fast pre-audit gate before mainnet
- Teams without a security budget need a free first-pass auditor
- Continuous auditing in CI needs machine-readable, deduped output
- **All of these need an auditor that produces actionable fixes, not just prose**

---

## 🚀 Live Deployment

| Resource | URL |
|----------|-----|
| **Live App** | [auditflow-theta.vercel.app](https://auditflow-theta.vercel.app) |
| **New Audit** | [auditflow-theta.vercel.app/dashboard/new](https://auditflow-theta.vercel.app/dashboard/new) |
| **Repository** | [github.com/Venkat5599/AuditFlow](https://github.com/Venkat5599/AuditFlow) |

### Architecture (Deployment)

The frontend + light APIs run on **Vercel**. The heavy audit engine (clone, static analyzers, LLM tools, fix generation) runs on a **VPS** that the audit endpoints reverse-proxy to - so audits aren't bound by serverless limits.

```
Browser ──▶ Vercel (Next.js UI + OAuth + branch/contract/file APIs)
                │  /api/audit, /api/pr  reverse-proxy
                ▼
            VPS engine (Docker) ──▶ clone → analyze → LLM tools → report → fix → PR
```

---

## 🧭 How It Works

### 1. Connect a repo

Connect GitHub (OAuth, token in an httpOnly cookie) to list your repos, or paste a public URL. Pick a **branch, tag, or commit** to audit.

### 2. Choose scope

Let the agents decide which contracts matter (follows imports/dependencies), or pick `.sol` files manually with a **built-in VSCode-style code viewer**.

### 3. Audit

A signal-based router selects the relevant tools and runs them - Slither + Aderyn for a deterministic baseline, LLM security detectors in parallel, plus Mantle L2 detectors - then dedupes and grades.

### 4. Auto-fix PR

For the findings you select, AuditFlow generates fixes against a fresh clone, validates each (apply + compile gate), commits the report, and opens the PR.

```
GitHub URL ──▶ clone (branch/tag/commit) ──▶ detect (.sol + framework)
           ──▶ route (signal-based tool selection)
           ──▶ audit: Slither + Aderyn + LLM detectors + Mantle L2 detectors
           ──▶ dedupe + grade → Code4rena-style report
           ──▶ generate fixes → validate (apply + compile) → open auto-fix PR
```

---

## 💻 Run It Yourself

### Web (full app)

```bash
# 1. Clone
git clone https://github.com/Venkat5599/AuditFlow.git
cd AuditFlow

# 2. Install (bun)
bun install

# 3. Configure
cp .env.example .env
# set OPENCODE_API_KEY (or DEEPSEEK_API_KEY) + GitHub OAuth vars

# 4. Dev server
bun run web        # http://localhost:3000
```

### CLI (single audit)

```bash
bun install
cp .env.example .env          # set engine key + GITHUB_TOKEN
bun run audit https://github.com/owner/repo --pr
```

### Docker (production)

```bash
docker build -t auditflow .
docker run -p 3000:3000 --env-file .env auditflow
```

---

## 🛡️ The Tooling

| Layer | What runs |
|-------|-----------|
| **Static analyzers** | Slither, Aderyn - deterministic, high-confidence baseline |
| **LLM detectors** | 31 audit tools covering reentrancy, access control, oracle/flashloan, accounting, proxy patterns |
| **Mantle L2 detectors** | 7 checks specific to Mantle's gas model and EVM target |
| **Router** | Signal-based - picks only the relevant tools per repo, never all at once |
| **Fix generator** | Full-file rewrite → `git diff` (guaranteed-applicable patches) |
| **Validation gate** | `git apply` + compile (`forge build` / `hardhat compile`) on an isolated copy |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          USER / DEVELOPER                          │
│              (connects GitHub or pastes a repo URL)                │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATOR (pipeline.ts)                    │
│   clone ─▶ detect ─▶ route ─▶ audit ─▶ report ─▶ fix ─▶ auto-PR   │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐     │
│  │ Signal router│  │  Dedupe +    │  │  Fix generator +     │     │
│  │ (top-N tools)│  │  C4 grading  │  │  validation gate     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘     │
└─────────┼─────────────────┼─────────────────────┼─────────────────┘
          │                 │                     │
          ▼                 ▼                     ▼
   ┌─────────────┐   ┌─────────────┐      ┌─────────────┐
   │  Analyzers  │   │ LLM audit   │      │  Mantle L2  │
   │  Slither    │   │ tools (31)  │      │  detectors  │
   │  Aderyn     │   │ OpenCode Zen│      │  gas/RNG/   │
   │             │   │ + DeepSeek  │      │  evmVersion │
   └─────────────┘   └─────────────┘      └─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │  Code4rena-style report    │
                    │  + validated auto-fix PR   │
                    └───────────────────────────┘
```

---

## 📁 Project Structure

```
AuditFlow/
├── src/
│   ├── orchestrator/   # pipeline spine: clone→detect→route→audit→report→fix→PR
│   ├── routing/        # tool registry + signal-based relevance router
│   ├── engine/         # LLM skill engine + analyzers + fix generator
│   ├── mantle/         # Mantle L2-specific detectors
│   ├── report/         # dedupe + Code4rena-style markdown
│   ├── github/         # clone, robust patch apply, validation gate, auto-fix PR
│   └── chain/          # on-chain attestation publisher (viem)
├── contracts/          # AuditRegistry.sol (Foundry, EVM target = paris for Mantle)
└── web/                # Next.js 15 UI + SSE audit API + code viewer
```

---

## ⛓️ On-Chain Attestation (Mantle)

`contracts/AuditRegistry.sol` records each audit `(repoId, reportHash, H/M/L counts, auditor)` on Mantle, so reports are **tamper-evident**. Env-gated - set `AUDITFLOW_REGISTRY` to enable.

```bash
# Deploy the registry to Mantle Sepolia (chainid 5003) or mainnet (5000)
cd contracts
forge script script/Deploy.s.sol --rpc-url mantle_sepolia --broadcast
```

### Network Details

```
Mantle Mainnet   Chain ID 5000   https://rpc.mantle.xyz
Mantle Sepolia   Chain ID 5003   https://rpc.sepolia.mantle.xyz
```

---

## 🛠️ Tech Stack

- **Runtime:** Bun, TypeScript
- **Frontend:** Next.js 15, React, TailwindCSS
- **Engine:** OpenCode Zen gateway + free DeepSeek model (REST fallback)
- **Analyzers:** Slither, Aderyn
- **Chain:** viem, Foundry · Mantle EVM (target `paris`)
- **GitHub:** Octokit (OAuth + auto-fix PRs)

---

## 📈 Status

- [x] GitHub OAuth + repo listing
- [x] Signal-based routing (31 tools, not all-at-once)
- [x] Slither + Aderyn baseline, deduped against LLM findings
- [x] Mantle L2 detectors
- [x] Code4rena-style graded report
- [x] Guided 5-step New Audit wizard + VSCode-style code viewer
- [x] Diff validation gate (apply + compile)
- [x] **Generated, validated auto-fix PRs**
- [x] Live on Vercel + VPS engine
- [ ] Mantle testnet deploy of the attestation registry
- [ ] Multi-chain expansion beyond Mantle

---

<div align="center">

## Built for the Mantle Turing Test Hackathon 2026 🏆

**Track 05 — AI DevTools**

*Repo in. Audit, fix, and PR out.*

</div>
