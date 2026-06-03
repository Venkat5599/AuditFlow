#!/usr/bin/env bash
# Vendor EVM/Solidity audit SKILL.md files from the hub into auditflow/skills/external/
# so they ship with the app and run on the VPS. Run from the hub root (parent of auditflow/).
set -euo pipefail
HUB="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$HUB/auditflow/skills/external"
mkdir -p "$OUT"

# id | focus(csv) | weight | source SKILL.md (relative to hub)
MANIFEST=$(cat <<'EOF'
qs-reentrancy|reentrancy,logic|0.95|qs_skills/plugins/reentrancy-pattern-analysis/skills/reentrancy-pattern-analysis/SKILL.md
qs-external-call|reentrancy,logic|0.9|qs_skills/plugins/external-call-safety/skills/external-call-safety/SKILL.md
qs-arithmetic|accounting,math|0.95|qs_skills/plugins/input-arithmetic-safety/skills/input-arithmetic-safety/SKILL.md
qs-oracle-flashloan|oracle,accounting|0.95|qs_skills/plugins/oracle-flashloan-analysis/skills/oracle-flashloan-analysis/SKILL.md
qs-proxy-upgrade|proxy|0.9|qs_skills/plugins/proxy-upgrade-safety/skills/proxy-upgrade-safety/SKILL.md
qs-dos-griefing|logic,accounting|0.85|qs_skills/plugins/dos-griefing-analysis/skills/dos-griefing-analysis/SKILL.md
qs-signature-replay|access-control,logic|0.85|qs_skills/plugins/signature-replay-analysis/skills/signature-replay-analysis/SKILL.md
qs-semantic-guard|access-control,logic|0.85|qs_skills/plugins/semantic-guard-analysis/skills/semantic-guard-analysis/SKILL.md
qs-state-invariant|accounting,logic|0.85|qs_skills/plugins/state-invariant-detection/skills/state-invariant-detection/SKILL.md
qs-behavioral-state|logic,accounting|0.8|qs_skills/plugins/behavioral-state-analysis/skills/behavioral-state-analysis/SKILL.md
qs-defender|general|0.8|qs_skills/plugins/defender/skills/defender/SKILL.md
nemesis|logic,general|0.9|nemesis-auditor/.claude/skills/nemesis-auditor/SKILL.md
nemesis-feynman|logic,general|0.85|nemesis-auditor/.claude/skills/feynman-auditor/SKILL.md
nemesis-state-inconsistency|accounting,logic|0.85|nemesis-auditor/.claude/skills/state-inconsistency-auditor/SKILL.md
forefy-audit|general,logic|0.8|forefy-context/skills/smart-contract-audit/SKILL.md
sc-auditor|general,best-practice|0.8|sc-auditor/skills/security-auditor/SKILL.md
cdsecurity|general|0.75|cdsecurity-skills/audit-prep/SKILL.md
web3-client-auditor|general|0.8|web3-skills/client-auditor/SKILL.md
scv-scan|general,swc|0.75|scv-scan/SKILL.md
solidityguard|evm,gas,general|0.75|SolidityGuard/apps/openclaw-skill/SKILL.md
zeroskills|general|0.7|ZeroSkills/code-sleuth/SKILL.md
solidity-ai-auditor|general|0.7|Solidity-AI-security-auditor/solidity_auditor/SKILL.md
bb-web3-audit|general,logic|0.8|claude-bug-bounty/skills/web3-audit/SKILL.md
EOF
)

echo "$MANIFEST" | while IFS='|' read -r id focus weight src; do
  [ -z "$id" ] && continue
  if [ -f "$HUB/$src" ]; then
    cp "$HUB/$src" "$OUT/$id.md"
    echo "vendored $id ($(wc -l < "$OUT/$id.md")L)"
  else
    echo "MISSING $id -> $src" >&2
  fi
done

# Emit a manifest the registry generator reads.
echo "$MANIFEST" | grep -v '^$' | awk -F'|' '{print $1"|"$2"|"$3}' > "$OUT/_manifest.txt"
echo "wrote $OUT/_manifest.txt"
