/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ['@dating-app/ui', '@dating-app/types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
  // Proxy /api/* through Vercel to the NestJS backend.
  // In production this makes API calls same-origin (crush-web-pi.vercel.app),
  // so cookies are stored normally without SameSite=None hacks or Safari quirks.
  async rewrites() {
    const isProd = process.env.NODE_ENV === 'production'
    const railwayBase = process.env.NEXT_PUBLIC_API_URL // e.g. https://crush-api-production.up.railway.app/api
    if (isProd && railwayBase) {
      return [
        { source: '/api/:path*', destination: `${railwayBase}/:path*` },
      ]
    }
    return [
      { source: '/api/:path*', destination: 'http://localhost:4000/api/:path*' },
      { source: '/socket.io/:path*', destination: 'http://localhost:4000/socket.io/:path*' },
    ]
  },
}

export default config
