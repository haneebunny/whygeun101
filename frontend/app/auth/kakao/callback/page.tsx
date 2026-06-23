"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authRepository } from "@/src/data/repositories/authApi";
import { useAlert } from "@/src/presentation/components/AlertContext";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const { showAlert } = useAlert();

  useEffect(() => {
    if (!code) return;

    const loginWithKakao = async () => {
      try {
        const redirectUri = window.location.origin + "/auth/kakao/callback";
        const result = await authRepository.loginWithKakao(code, redirectUri);

        // Save token and nickname to browser local storage
        localStorage.setItem("token", result.token);
        localStorage.setItem("nickname", result.nickname);

        router.push("/"); // Back to home
      } catch (error: any) {
        console.error("Login error:", error);
        showAlert({
          title: "로그인 실패",
          message: "카카오 로그인 연동에 실패했습니다. 다시 시도해 주세요.",
          type: "error",
          debugInfo: error.stack || error.toString()
        });
        router.push("/");
      }
    };

    loginWithKakao();
  }, [code, router]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
      <p className="text-slate-600 font-bold">카카오 로그인 처리 중입니다...</p>
    </div>
  );
}

export default function KakaoCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex justify-center items-center">
          로딩중...
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
