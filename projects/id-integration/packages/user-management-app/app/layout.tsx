import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppNav } from './components/AppNav';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'User management',
  description: 'Manage users via the management API',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className={`min-h-full flex flex-col font-sans ${inter.className}`}>
        <AppNav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
