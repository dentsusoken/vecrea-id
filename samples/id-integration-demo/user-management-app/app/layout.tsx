import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AmplifyProvider from "@/components/amplify-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "User Management Console",
  description: "IdP User Management Console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-gray-900">
        <AmplifyProvider>{children}</AmplifyProvider>
      </body>
    </html>
  );
}
