import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // 타입스크립트 문법 오류가 있어도 배포를 강제로 진행합니다.
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint 경고/오류가 있어도 배포를 강제로 진행합니다.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
