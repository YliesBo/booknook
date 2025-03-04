import type { NextConfig } from "next";

// @ts-ignore
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false  // Changé de process.env.NODE_ENV === 'development' à false
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);