import type { NextConfig } from "next";

const basePath = "/riftbound-collection";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
};

export default nextConfig;
