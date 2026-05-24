/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname:  "**.supabase.co",
        pathname:  "/storage/v1/object/**",
      },
      {
        protocol: "https",
        hostname:  "maps.googleapis.com",
        pathname:  "/maps/api/streetview**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options",        value: "DENY" },
          { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection",       value: "1; mode=block" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
