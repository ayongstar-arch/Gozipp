/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  // Since we have a backend on port 3000, we might need a proxy for development
  // but for now we'll use absolute URLs or the IS_PRODUCTION check in constants.ts
};

module.exports = nextConfig;
