import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  outputFileTracingIncludes: {
    '/api/siwas-report': ['./src/content/laporan_ketepatan_waktu_SIWAS.html'],
  },
};

export default nextConfig;
