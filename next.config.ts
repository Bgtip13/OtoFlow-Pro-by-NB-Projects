import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Host preview cloud diizinkan memuat dev server ini
  allowedDevOrigins: ["pv-5ac09737ce12-5d10b63d-c8e6-475b-a0a0-0c3d9702c80d.style.dev"],
  experimental: {
    // Tree-shaking lebih baik untuk paket besar (ikon & excel) sehingga
    // bundel awal lebih kecil dan halaman terasa lebih cepat.
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
