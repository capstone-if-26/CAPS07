/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['onnxruntime-node', '@xenova/transformers', "pdfjs-dist", "mammoth"],
};

export default nextConfig;