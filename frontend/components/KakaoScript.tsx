/* eslint-disable @next/next/no-sync-scripts */
"use client";

// 전역 window 객체 컴파일 에러 방지용 타입 확장
declare global {
  interface Window {
    Kakao: any;
  }
}

export default function KakaoScript() {
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  return (
    <>
      <script
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.1/kakao.min.js"
        integrity="sha384-kDljxUXHaJ9xAb2AzRd59KxjrFjzHa5TAoFQ6GbYTCAG0bjM55XohjjDT7tDDC01"
        crossOrigin="anonymous"
      />
      {/* 로드 완료 후 초기화를 실행할 인라인 스크립트 */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var checkKakao = setInterval(function() {
                if (typeof window !== "undefined" && window.Kakao) {
                  clearInterval(checkKakao);
                  if (!window.Kakao.isInitialized()) {
                    window.Kakao.init("${kakaoKey || ""}");
                    console.log("🟢 카카오톡 SDK 초기화 성공:", window.Kakao.isInitialized());
                  }
                }
              }, 100);
            })();
          `,
        }}
      />
    </>
  );
}
