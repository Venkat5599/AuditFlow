// Publish an audit attestation to the AuditRegistry contract on Mantle.
// Env-gated: only runs if AUDITFLOW_REGISTRY + AUDITFLOW_PRIVATE_KEY are set.
import { createWalletClient, http, keccak256, toHex, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AuditReport } from "../types";

export const mantle = defineChain({
  id: 5000, name: "Mantle", nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mantle.xyz"] } },
});
export const mantleSepolia = defineChain({
  id: 5003, name: "Mantle Sepolia", nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.sepolia.mantle.xyz"] } },
});

const ABI = [{
  type: "function", name: "attest", stateMutability: "nonpayable",
  inputs: [
    { name: "repoId", type: "bytes32" }, { name: "reportHash", type: "bytes32" },
    { name: "high", type: "uint32" }, { name: "medium", type: "uint32" }, { name: "low", type: "uint32" },
  ],
  outputs: [{ name: "id", type: "uint256" }],
}] as const;

export interface AttestResult { txHash: string; repoId: string; reportHash: string; }

export async function attestOnMantle(report: AuditReport): Promise<AttestResult | null> {
  const registry = process.env.AUDITFLOW_REGISTRY as `0x${string}` | undefined;
  const pk = process.env.AUDITFLOW_PRIVATE_KEY as `0x${string}` | undefined;
  if (!registry || !pk) return null;

  const chain = process.env.AUDITFLOW_CHAIN === "mainnet" ? mantle : mantleSepolia;
  const account = privateKeyToAccount(pk);
  const client = createWalletClient({ account, chain, transport: http() });

  const repoId = keccak256(toHex(`${report.repo.owner}/${report.repo.name}@${report.repo.defaultBranch}`));
  const reportHash = keccak256(toHex(report.markdown));

  const txHash = await client.writeContract({
    address: registry, abi: ABI, functionName: "attest", chain, account,
    args: [repoId, reportHash, report.summary.High, report.summary.Medium, report.summary.Low],
  });
  return { txHash, repoId, reportHash };
}
