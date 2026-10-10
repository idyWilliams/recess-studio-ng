import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@recess/ui'],
  reactStrictMode: true,
};

export default nextConfig;
