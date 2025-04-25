/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["localhost"],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/uploads/**',
      },
    ],
  },
};

module.exports = nextConfig;
