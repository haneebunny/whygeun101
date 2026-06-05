"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const IS_DEV = process.env.NODE_ENV === "development";
  // 💡 메인 페이지에서 쓰던 내 백엔드 아이피 그대로 사용!
  const BACKEND_IP = IS_DEV ? "localhost:8000" : "sales-map-db.onrender.com";
  const protocol = IS_DEV ? "http" : "https";

  useEffect(() => {
    if (!code) return;

    const loginWithKakao = async () => {
      try {
        const response = await fetch(
          `${protocol}://${BACKEND_IP}/api/auth/kakao`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: code,
              redirect_uri: window.location.origin + "/auth/kakao/callback",
            }),
          },
        );

        if (response.ok) {
          const data = await response.json();
          // 💡 발급받은 '출입증(토큰)'을 내 브라우저 금고(localStorage)에 보관!
          localStorage.setItem("token", data.access_token);
          localStorage.setItem("nickname", data.nickname);

          router.push("/"); // 메인 화면으로 돌아가기
        } else {
          alert("로그인에 실패했습니다.");
          router.push("/");
        }
      } catch (error) {
        console.error("로그인 에러:", error);
        router.push("/");
      }
    };

    loginWithKakao();
  }, [code, router, protocol, BACKEND_IP]);

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex flex-col justify-center items-center">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
      <p className="text-slate-600 font-bold">카카오 로그인 처리 중입니다...</p>
    </div>
  );
}

export default function KakaoCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f5f7fa] flex justify-center items-center">
          로딩중...
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
