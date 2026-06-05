import path from "path";

const isVercelBuild = process.env.VERCEL === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    ...(isVercelBuild
      ? ["onnxruntime-web"]
      : ["@huggingface/transformers", "onnxruntime-node"]),
    "mammoth",
    "pdf-parse",
    "pino",
    "pino-pretty",
    "thread-stream",
  ],

  webpack(config: any, { isServer }: { isServer: boolean }) {
    if (isServer && isVercelBuild) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@huggingface/transformers": path.resolve(
          "./node_modules/@huggingface/transformers/dist/transformers.web.js",
        ),
        "onnxruntime-node": false,
      };
    }

    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    return config;
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXT_PUBLIC_APP_URL || "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With",
          },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
};

export default nextConfig;
