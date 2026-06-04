import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "외근의 정석",
  description: "위치 기반 동선 관리로 매일 더 스마트한 외근을 시작하세요.",
  authors: [{ name: "현서친구 하니" }],
  openGraph: {
    title: "외근의 정석 | 스마트한 영업 동선 관리",
    description: "매일 더 스마트한 외근을 시작하세요! (만든이 : 현서친구 하니)",
    siteName: "외근의 정석",
    images: [
      {
        url: "/images/meta_img.png",
        width: 1200,
        height: 630,
        alt: "외근의 정석 썸네일",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "외근의 정석 | 스마트한 영업 동선 관리",
    description: "매일 더 스마트한 외근을 시작하세요! (만든이 : 현서친구 하니)",
    images: ["/images/meta_img.png"],
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
