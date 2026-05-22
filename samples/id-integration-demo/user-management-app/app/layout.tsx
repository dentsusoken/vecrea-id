import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AmplifyProvider from "@/components/amplify-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ユーザー管理コンソール",
  description: "IdP ユーザー管理コンソール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-gray-900">
        <AmplifyProvider>{children}</AmplifyProvider>
      </body>
    </html>
  );
}
