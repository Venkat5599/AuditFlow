/** @type {import('next').NextConfig} */

// When AUDITFLOW_BACKEND is set (Vercel deploy), reverse-proxy the heavy audit
// endpoints to the VPS engine. The VPS itself leaves this unset and runs locally.
const backend = process.env.AUDITFLOW_BACKEND;

const nextConfig = {
  outputFileTracingRoot: new URL("..", import.meta.url).pathname,
  async rewrites() {
    if (!backend) return [];
    return {
      beforeFiles: [
        { source: "/api/audit", destination: `${backend}/api/audit` },
        { source: "/api/pr", destination: `${backend}/api/pr` },
      ],
    };
  },
};
export default nextConfig;
