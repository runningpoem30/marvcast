import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to allow webpack config
  turbopack: {},

  // Webpack configuration for handling ffmpeg
  webpack: (config, { isServer }) => {
    // Don't bundle ffmpeg on server side
    if (isServer) {
      config.externals = [...(config.externals || []), "@ffmpeg/ffmpeg", "@ffmpeg/util"];
    }

    // Add fallbacks for node modules not available in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    return config;
  },

  // Headers - use credentialless COEP to allow cross-origin resources
  async headers() {
    return [
      {
        // Only apply strict headers to the record page where FFmpeg runs
        source: "/record",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
