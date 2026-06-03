import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const webDir = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */

// When AUDITFLOW_BACKEND is set (Vercel deploy), reverse-proxy the heavy audit
// endpoints to the VPS engine. The VPS itself leaves this unset and runs locally.
const backend = process.env.AUDITFLOW_BACKEND;

const nextConfig = {
  outputFileTracingRoot: new URL("..", import.meta.url).pathname,
  webpack(config) {
    // `@/` -> web/ (tsconfig paths aren't picked up reliably in this monorepo layout)
    config.resolve.alias["@"] = webDir;
    return config;
  },
  async rewrites() {
    if (!backend) return [];
    return {
      beforeFiles: [
        { source: "/api/audit", destination: `${backend}/api/audit` },
        { source: "/api/pr", destination: `${backend}/api/pr` },
        { source: "/api/chat", destination: `${backend}/api/chat` },
      ],
    };
  },
};
export default nextConfig;
