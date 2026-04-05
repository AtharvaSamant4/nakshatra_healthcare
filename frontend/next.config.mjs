/** @type {import('next').NextConfig} */
const backend =
  (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "")

const nextConfig = {
  typescript:
 { ignoreBuildErrors: true },
  images: { unoptimized: true },
  serverExternalPackages: ['jspdf'],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ]
  },
};
export default nextConfig;
