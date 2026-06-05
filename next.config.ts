/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "onnxruntime-node",
    "@huggingface/transformers",
    "mammoth",
    "pdf-parse",
    "pino",
    "pino-pretty",
    "thread-stream",
  ],

  async headers() {
    return [
      {
        // Terapkan CORS ke semua API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_APP_URL || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Requested-With" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
};

export default nextConfig;
