"use client";

export default function Login() {
  const KAKAO_CLIENT_ID = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;

  const REDIRECT_URI =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/kakao/callback`
      : "https://sales-map-db.vercel.app/auth/kakao/callback";

  const handleKakaoLogin = () => {
    if (!KAKAO_CLIENT_ID) {
      alert("환경변수(NEXT_PUBLIC_KAKAO_REST_API_KEY)가 설정되지 않았습니다.");
      return;
    }
    window.location.href = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex flex-col justify-center items-center p-5 relative overflow-hidden max-w-md mx-auto shadow-2xl">
      <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-blue-50 to-transparent"></div>

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            외근의 정석
          </h1>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            위치 기반 동선 관리로
            <br />
            매일 더 스마트한 외근을 시작하세요
          </p>
        </div>

        <div className="w-full mt-10">
          <button
            onClick={handleKakaoLogin}
            className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-[#000000] hover:bg-[#FDD800] transition-colors py-4 px-6 rounded-xl font-bold shadow-sm"
          >
            <svg viewBox="0 0 32 32" width="20" height="20">
              <path
                fill="#000000"
                d="M16 4.64c-6.96 0-12.64 4.48-12.64 10.08 0 3.52 2.32 6.64 5.76 8.48l-1.44 5.44c-0.16 0.48 0.4 0.8 0.8 0.48l6.24-4.16c0.4 0 0.88 0.08 1.28 0.08 6.96 0 12.64-4.48 12.64-10.08S22.96 4.64 16 4.64z"
              ></path>
            </svg>
            카카오로 3초 만에 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
