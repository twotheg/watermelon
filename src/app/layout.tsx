import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "과일 합치기 - Fruit Merge PWA",
  description: "Drop and merge fruits! 귀여운 과일을 떨어뜨려 합치는 물리 퍼즐 게임입니다.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Fruit Merge",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/icon-512.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4CAF50",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 구글 애드센스 스크립트 (나중에 클라이언트 ID만 본인 것으로 변경하세요) */}
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4424569297437395" crossOrigin="anonymous"></script>
      </head>
      <body className="bg-[#FFF8E7] text-slate-900 antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
