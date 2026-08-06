import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "amajeste.com.br" },
      { protocol: "https", hostname: "equilibra.tech" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "*.fbcdn.net" },
      { protocol: "https", hostname: "scontent.cdninstagram.com" },
    ],
    formats: ["image/webp"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "120mb",
    },
    // Next 15.5+: limpia o proxy interno (default ~10MB). Sem isso, upload
    // de vídeo quebra com "Failed to parse body as FormData".
    // Tipos do Next ainda não listam essas chaves.
    proxyClientMaxBodySize: "120mb",
    middlewareClientMaxBodySize: "120mb",
  } as NextConfig["experimental"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-web/webgpu": false,
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
