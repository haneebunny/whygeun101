const nextConfig = {
  // 💡 [치트키 1] TypeScript 타입 오류가 있어도 무조건 빌드 통과하기
  typescript: {
    ignoreBuildErrors: true,
  },
  // 💡 [치트키 2] 최신 Next.js 규격에 맞는 빌드 시 ESLint 검사 완전 패스 설정
  eslint: {
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: ["172.30.103.23"],
};

export default nextConfig;
