# AuditFlow web app + audit engine. Bundles git, python (slither), foundry-less base.
FROM oven/bun:1.3 AS base
WORKDIR /app

# System deps the engine shells out to: git (clone), python+pip (slither/aderyn optional).
RUN apt-get update && apt-get install -y --no-install-recommends \
    git ca-certificates python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*
# Static analyzers (optional but recommended for the deterministic baseline).
RUN pip3 install --break-system-packages slither-analyzer || true

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install
COPY . .

# Production build of the Next app.
RUN bun run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
