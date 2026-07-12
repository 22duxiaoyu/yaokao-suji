import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://yaokao-suji.netlify.app"),
  title: "药考速记 - AI 药考学习工具",
  description: "把个人药考资料转化为可追溯知识卡，并根据薄弱点安排复习。",
  openGraph: {
    title: "药考速记",
    description: "从资料、AI 出卡到精准复习，建立自己的药考知识库。",
    type: "website",
    locale: "zh_CN"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
