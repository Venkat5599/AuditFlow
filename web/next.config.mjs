/** @type {import('next').NextConfig} */
const nextConfig = {
  // API routes shell out to git/slither/opencode — keep them on the Node runtime.
  output: "standalone",
  // Allow importing the orchestrator from ../src (outside the web/ root).
  outputFileTracingRoot: new URL("..", import.meta.url).pathname,
};
export default nextConfig;
