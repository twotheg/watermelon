import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "수박 합치기 - Suika Merge PWA",
  description:
    "귀여운 과일을 떨어뜨려 합치고 최종 수박을 만드는 물리 퍼즐 게임입니다.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "수박 합치기",
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
      <body className="bg-[#FFF8E7] text-slate-900 antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
