import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Add empty turbopack config to silence the error
  turbopack: {},

  webpack: (config, { dev }) => {
    if (dev) {
      config.infrastructureLogging = {
        level: 'error',
      }
    }
    return config
  },
}

export default nextConfig
