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
        destination: 'http://localhost:4100/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
