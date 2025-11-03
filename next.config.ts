import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // External packages for server components
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'my-erp-po-uploads.s3.eu-north-1.amazonaws.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Split vendor chunks for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Create a chunk for React/Next.js
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?:react|react-dom)$/,
            priority: 40,
            enforce: true,
          },
          // Create a chunk for UI libraries
          lib: {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
            name: 'lib',
            priority: 30,
            chunks: 'all',
          },
          // Commons chunk for shared modules
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
            chunks: 'all',
          },
        },
      };
    }
    return config;
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Output optimization
  output: 'standalone',
  
  // Compression
  compress: true,
  
  // Headers for security and cache control
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      // Minimal caching for API routes (30 seconds instead of 5 minutes)
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=30, s-maxage=30, stale-while-revalidate=10',
          },
        ],
      },
      // No caching for mutation endpoints
      {
        source: '/api/:path*/route',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;