/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['onnxruntime-node', '@xenova/transformers'],
};

export default nextConfig;