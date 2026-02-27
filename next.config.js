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
      // Keep local NextAuth routes in sp-admin.
      {
        source: '/api/:path((?!auth).*)',
        destination: 'http://localhost:4100/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
