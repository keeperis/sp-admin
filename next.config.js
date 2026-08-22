function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

const apiOrigin = trimTrailingSlash(
  process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4100',
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.facebook.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.fbcdn.net', pathname: '/**' },
    ],
  },
  async rewrites() {
    return [
      // Keep local NextAuth and admin proxy routes in sp-admin.
      {
        source: '/api/:path((?!auth|admin).*)',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
