import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack for production builds (use webpack)
  // This fixes dynamic import issues with @ffmpeg packages
  experimental: {
    turbo: {
      // Externalize ffmpeg packages to avoid bundling issues
    },
  },

  // Webpack configuration for handling ffmpeg
  webpack: (config, { isServer }) => {
    // Don't bundle ffmpeg on server side
    if (isServer) {
      config.externals = [...(config.externals || []), "@ffmpeg/ffmpeg", "@ffmpeg/util"];
    }

    // Add headers for SharedArrayBuffer support (required by FFmpeg)
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
