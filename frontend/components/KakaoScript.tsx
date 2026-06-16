"use client";

import Script from "next/script";

// 전역 window 객체 컴파일 에러 방지용 타입 확장
declare global {
  interface Window {
    Kakao: any;
  }
}

export default function KakaoScript() {
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.1/kakao.min.js"
      integrity="sha384-kDljxUXHaJ9xAb2AzRd59KxjrFjzHa5TAoFQ6GbYTCAG0bjM55XohjjDT7tDDC01"
      crossOrigin="anonymous"
      strategy="afterInteractive"
      onLoad={() => {
        if (typeof window !== "undefined" && window.Kakao) {
          if (!window.Kakao.isInitialized()) {
            window.Kakao.init(kakaoKey || "");
            console.log(
              "🟢 카카오톡 SDK 초기화 성공:",
              window.Kakao.isInitialized(),
            );
          }
        }
      }}
    />
  );
}
