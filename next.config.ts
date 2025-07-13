import type { NextConfig } from "next";

const nextConfig: NextConfig = {
images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'my-erp-po-uploads.s3.eu-north-1.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
   eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
