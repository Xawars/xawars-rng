import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // ponytail: wiki CDN times out under Next.js image optimizer — use unoptimized passthrough
    // upgrade path: self-host portraits in Supabase storage and re-enable optimization
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.wikia.nocookie.net",
      },
    ],
  },
};

export default nextConfig;
