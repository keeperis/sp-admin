function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

const apiOrigin = trimTrailingSlash(
  process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4100',
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    incomingRequests: {
      ignore: [/^\/admin\/shop\/preview(?:\?|$)/, /^\/login(?:\?|$)/, /^\/api\/auth\//],
    },
  },
  async headers() {
    return [
      {
        source: '/admin-push-sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.facebook.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.fbcdn.net', pathname: '/**' },
    ],
  },
  async rewrites() {
    return [
      // Keep authentication, admin APIs and authenticated shop image routes local.
      {
        source: '/api/:path((?!auth|admin|shop/(?:media|demo)(?:/|$)).*)',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
