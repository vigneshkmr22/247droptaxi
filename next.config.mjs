/** @type {import('next').NextConfig} */
const nextConfig = {
  // PGlite (the local-only database) is loaded at runtime, never bundled
  serverExternalPackages: ['@electric-sql/pglite'],
  images: { unoptimized: true },
  poweredByHeader: false,
};
export default nextConfig;
