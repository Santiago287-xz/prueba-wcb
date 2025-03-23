/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["res.cloudinary.com"],
  },
  suppressHydrationWarning: true
};

module.exports = nextConfig;
