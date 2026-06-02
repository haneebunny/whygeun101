import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

export const metadata = {
  title: "영업 동선 지도 서비스",
  description: "엑셀 업로드 기반 카카오 맵 핀 매핑 시스템",
  other: {
    "Content-Security-Policy": "upgrade-insecure-requests",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* 💡 카카오 지도 라이브러리를 전역으로 로드합니다 */}
        <script
          src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false`}
          async
          defer
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
