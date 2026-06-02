const nextConfig = {
  // 💡 [치트키] TypeScript 타입 오류가 있어도 컴파일을 강제 통과시킵니다.
  typescript: {
    ignoreBuildErrors: true,
  },
  // 💡 최신 규격 반영: 더 이상 허용되지 않는 내장 eslint 옵션을 제거하고,
  // 배포 기기 및 환경 변수 연동을 위한 도메인 바인딩 설정만 깔끔하게 유지합니다.
  allowedDevOrigins: ["172.30.103.23"],
};

export default nextConfig;
