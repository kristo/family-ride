import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/trasy/:id",
        destination: "/routes/:id",
        permanent: true,
      },
      {
        source: "/dodaj-trase",
        destination: "/submit-route",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
