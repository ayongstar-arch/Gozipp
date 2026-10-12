/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'gozipp.app' },
    ],
  },
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
  async rewrites() {
    const backendUrl =
      process.env.NEST_API_URL ||
      process.env.GOZIPP_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://gozipp-api-staging-production.up.railway.app';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
