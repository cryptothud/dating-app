import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@dating-app/ui', '@dating-app/types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
}

export default config
