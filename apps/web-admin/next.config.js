/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/auth/check-status',
        destination: '/api/v1/auth/check-status',
      },
      {
        source: '/auth/login-pin',
        destination: '/api/v1/auth/login-pin',
      },
      {
        source: '/auth/set-pin',
        destination: '/api/v1/auth/set-pin',
      },
      {
        source: '/passenger/request-otp',
        destination: '/api/v1/auth/request-otp',
      },
      {
        source: '/passenger/register',
        destination: '/api/v1/auth/verify-otp',
      },
      {
        source: '/passenger/login',
        destination: '/api/v1/auth/login-pin',
      },
      {
        source: '/driver/request-otp',
        destination: '/api/v1/auth/request-otp',
      },
      {
        source: '/driver/login',
        destination: '/driver/login',
      },
      {
        source: '/driver/register',
        destination: '/driver/register',
      },
    ];
  },
};

module.exports = nextConfig;
