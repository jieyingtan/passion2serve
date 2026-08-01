import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.1.16"],
  // Keep production builds separate from the live development cache. Running
  // `npm run build` while `npm run dev` is open must not invalidate dev chunks.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [{
      source: "/:path*",
      headers: [{ key: "Permissions-Policy", value: "camera=(self)" }],
    }];
  },
};

export default nextConfig;
