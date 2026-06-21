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
  // Since we have a backend on port 3000, we might need a proxy for development
  // but for now we'll use absolute URLs or the IS_PRODUCTION check in constants.ts
};

module.exports = nextConfig;
