/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  typescript:
 { ignoreBuildErrors: true },
  images: { unoptimized: true },
  serverExternalPackages: ['jspdf', '@supabase/supabase-js'],
  turbopack: {}
};
export default nextConfig;
