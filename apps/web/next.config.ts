import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@recess/ui', '@recess/shared', '@recess/game-word-battle'],
  reactStrictMode: true,
  async rewrites() {
    // Same-origin proxy to the API service (apps/api, default port 4000). The API has no
    // CORS plugin by design, so the browser talks to /backend/* on its own origin and the
    // Next.js server forwards the request. Override the target with API_PROXY_TARGET.
    const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';
    return [{ source: '/backend/:path*', destination: `${apiTarget}/:path*` }];
  },
};

export default nextConfig;
