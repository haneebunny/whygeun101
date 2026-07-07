import type { Metadata, Viewport } from "next";
import "./globals.css";
import Script from "next/script";
import KakaoScript from "@/components/KakaoScript";

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://whygeun101.com"),
  title: "모두의 외근",
  description: "위치 기반 동선 관리로 매일 더 스마트한 외근을 시작하세요.",
  authors: [{ name: "현서친구 하니" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "모두의 외근",
  },
  openGraph: {
    title: "모두의 외근 | 스마트한 영업 동선 관리",
    description: "매일 더 스마트한 외근을 시작하세요! (만든이 : 현서친구 하니)",
    siteName: "모두의 외근",
    images: [
      {
        url: "/images/meta_img.png",
        width: 1200,
        height: 630,
        alt: "모두의 외근 썸네일",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "모두의 외근 | 스마트한 영업 동선 관리",
    description: "매일 더 스마트한 외근을 시작하세요! (만든이 : 현서친구 하니)",
    images: ["/images/meta_img.png"],
  },
};

import { AlertProvider } from "@/src/presentation/components/AlertContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 1. 카카오 로그인 SDK */}
        <KakaoScript />

        {/* 2. 서비스 워커 등록 스크립트 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js');
              }
            `,
          }}
        />

        {/* 3. 카카오맵 지도 SDK */}
        <Script
          src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false`}
          strategy="lazyOnload"
        />
      </head>
      <body>
        <AlertProvider>
          {children}
        </AlertProvider>
      </body>
    </html>
  );
}
