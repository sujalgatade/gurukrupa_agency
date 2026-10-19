/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV === "development";

// Keep `next dev` output separate so a production build cannot replace the
// development CSS and manifests while the local app is running.
const nextConfig = {
  distDir: isDevelopment ? ".next-dev" : ".next-production",
};

export default nextConfig;
