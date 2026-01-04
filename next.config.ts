import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,

  // Skip TypeScript type checking during build (run separately with npm run type-check)
  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Fix turbopack config with absolute path
  turbopack: {
    root: path.resolve(__dirname),
  },

  webpack: (config, { dev }) => {
    if (dev) {
      config.infrastructureLogging = {
        level: "error",
      };
    }
    return config;
  },
};

export default nextConfig;
