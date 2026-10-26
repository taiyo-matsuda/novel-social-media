import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI小説SNS（仮）",
  description: "AIがあなた専用の小説を書き、みんなで読み合うSNS",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
