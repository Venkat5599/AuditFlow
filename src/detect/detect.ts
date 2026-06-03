// Detect Solidity sources + build framework in a cloned target repo.
import { readdirSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { TargetRepo } from "../types";

const IGNORE = new Set(["node_modules", ".git", "lib", "out", "artifacts", "cache", "broadcast"]);

export function findContracts(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (IGNORE.has(entry)) continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (entry.endsWith(".sol")) found.push(relative(root, full).replace(/\\/g, "/"));
    }
  };
  walk(root);
  return found;
}

export function detectFramework(root: string): TargetRepo["framework"] {
  if (existsSync(join(root, "foundry.toml"))) return "foundry";
  if (existsSync(join(root, "hardhat.config.js")) || existsSync(join(root, "hardhat.config.ts"))) return "hardhat";
  if (existsSync(join(root, "truffle-config.js"))) return "truffle";
  if (findContracts(root).length > 0) return "raw";
  return "unknown";
}
