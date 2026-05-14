import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allow up to 31 MB: 30 MB max total attachment size + overhead
      bodySizeLimit: '31mb',
    },
  },
};

export default nextConfig;
