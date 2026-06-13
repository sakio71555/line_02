import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, "../..");

/** @type {import("next").NextConfig} */
const nextConfig = {
  outputFileTracingRoot: monorepoRoot,
  reactStrictMode: true,
  poweredByHeader: false
};

export default nextConfig;
