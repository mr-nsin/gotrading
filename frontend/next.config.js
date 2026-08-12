/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
      {
        source: '/stream/:path*',
        destination: 'http://localhost:8080/stream/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
