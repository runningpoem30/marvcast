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

  // Headers for SharedArrayBuffer (needed by FFmpeg WASM)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
