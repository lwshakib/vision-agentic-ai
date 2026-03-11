import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
      },
    ],
  },
  async rewrites() {
    const fluxUrl = process.env.FLUX_WORKER_URL;
    const apiKey = process.env.CLOUDFLARE_API_KEY;

    // Prevent 500 error if environment variables are missing
    if (!fluxUrl || !apiKey) {
      return [];
    }

    return [
      {
        // Proxy for live ASR (Flux)
        source: '/api/flux/stream',
        destination: `${fluxUrl?.replace('wss://', 'https://')}?token=${apiKey}`,
      },
    ];
  },
};

export default nextConfig;
