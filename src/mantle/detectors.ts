// Mantle-specific Solidity detectors. This is the Track-05 differentiator:
// generic auditors miss L2/Mantle semantics. Pure static regex scan, high signal.
//
// Mantle = OP-stack L2 with a NON-ETH gas token (MNT). Key gotchas:
//  - MNT is the native gas token; ETH is an ERC-20 -> msg.value/native assumptions break.
//  - L1 data fee dominates cost; naive gas refunds / gasleft() accounting is wrong.
//  - block.number / block.timestamp follow the sequencer, not L1.
//  - blockhash() is unreliable / mostly zero on L2 -> bad RNG source.
//  - Hardcoded L1-mainnet addresses (Chainlink feeds, tokens) don't exist on Mantle.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { Finding, Severity, TargetRepo } from "../types";

interface Rule {
  re: RegExp;
  severity: Severity;
  title: string;
  impact: string;
  recommendation: string;
}

const RULES: Rule[] = [
  {
    re: /blockhash\s*\(/,
    severity: "High",
    title: "blockhash() used as randomness on Mantle L2",
    impact: "On OP-stack L2s blockhash of recent blocks is often zero/predictable; using it for randomness lets an attacker predict or grind outcomes.",
    recommendation: "Use a VRF (e.g. a Mantle-supported oracle) instead of blockhash/block.* for randomness.",
  },
  {
    re: /block\.(difficulty|prevrandao)/,
    severity: "Medium",
    title: "block.difficulty/prevrandao as entropy on L2",
    impact: "prevrandao is not a secure entropy source on Mantle's sequencer; manipulable for randomness-dependent logic.",
    recommendation: "Replace with a verifiable randomness source.",
  },
  {
    re: /\bgasleft\s*\(\)|tx\.gasprice/,
    severity: "Medium",
    title: "L1-style gas accounting on Mantle",
    impact: "Mantle cost is dominated by the L1 data fee, not L2 execution gas. gasleft()/tx.gasprice-based refunds or fee logic misprice transactions.",
    recommendation: "Avoid gas-based refunds; account for L1 data fee via Mantle's GasPriceOracle predeploy if needed.",
  },
  {
    re: /payable\s*\(.*\)\.transfer\s*\(|\.transfer\s*\(\s*[^)]*\)\s*;|address\([^)]*\)\.transfer/,
    severity: "Medium",
    title: ".transfer()/.send() 2300-gas stipend assumption",
    impact: "Fixed 2300-gas stipend is unsafe across EVM/L2 opcode-cost changes; can brick withdrawals on Mantle.",
    recommendation: "Use call{value:...}('') with checks-effects-interactions + reentrancy guard.",
  },
  {
    re: /0x[a-fA-F0-9]{40}/,
    severity: "Low",
    title: "Hardcoded address — verify it exists on Mantle",
    impact: "Hardcoded L1/other-chain addresses (Chainlink feeds, tokens, multisigs) may not exist on Mantle, silently breaking integrations.",
    recommendation: "Move addresses to constructor/config and confirm each against Mantle mainnet (5000) / Sepolia (5003).",
  },
  {
    re: /msg\.value/,
    severity: "Low",
    title: "Native-value (msg.value) logic on MNT-gas chain",
    impact: "On Mantle the native gas token is MNT, and ETH is an ERC-20. Contracts assuming msg.value == ETH may mishandle value or be unbridgeable.",
    recommendation: "Confirm whether native MNT or ERC-20 ETH is intended; handle ETH via its ERC-20 interface on Mantle.",
  },
  {
    re: /pragma\s+solidity\s+[^;]*0\.8\.(1[0-9]|2[0-9])/,
    severity: "QA",
    title: "Solc >=0.8.20 emits PUSH0 — confirm Mantle EVM target",
    impact: "PUSH0 (Shanghai) may not be enabled on all Mantle deployments; bytecode can revert at deploy/runtime.",
    recommendation: "Set evmVersion to 'paris' (or a Mantle-confirmed target) in the compiler config.",
  },
];

const IGNORE_LINE = /^\s*(\/\/|\*|\/\*)/;

export function runMantleDetectors(repo: TargetRepo): Finding[] {
  const out: Finding[] = [];
  for (const file of repo.contracts.slice(0, 200)) {
    let src: string;
    try { src = readFileSync(join(repo.localPath, file), "utf8"); } catch { continue; }
    const lines = src.split("\n");
    for (const rule of RULES) {
      for (let i = 0; i < lines.length; i++) {
        if (IGNORE_LINE.test(lines[i])) continue;
        if (!rule.re.test(lines[i])) continue;
        out.push({
          id: createHash("sha1").update(`mantle:${file}:${i}:${rule.title}`).digest("hex").slice(0, 12),
          severity: rule.severity,
          title: rule.title,
          file,
          lines: [i + 1, i + 1],
          impact: rule.impact,
          description: `Matched \`${lines[i].trim().slice(0, 100)}\``,
          recommendation: rule.recommendation,
          tool: "mantle-detectors",
          confidence: rule.severity === "Low" || rule.severity === "QA" ? "low" : "medium",
        });
        break; // one finding per rule per file keeps noise down
      }
    }
  }
  return out;
}
