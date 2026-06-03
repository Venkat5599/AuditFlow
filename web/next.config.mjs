/** @type {import('next').NextConfig} */
const nextConfig = {
  // We run `next start` (not the standalone server), so no `output: standalone`.
  // Allow importing the orchestrator from ../src (outside the web/ root).
  outputFileTracingRoot: new URL("..", import.meta.url).pathname,
};
export default nextConfig;
