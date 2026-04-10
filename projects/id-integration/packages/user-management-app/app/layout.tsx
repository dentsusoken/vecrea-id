import type { Metadata } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import { AppNav } from './components/AppNav';
import './globals.css';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-source-sans',
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
    <html lang="en" className={`${sourceSans.variable} h-full`}>
      <body className={`min-h-full flex flex-col font-sans antialiased`}>
        <AppNav />
        <main className="flex-1 bg-white text-um-text">{children}</main>
      </body>
    </html>
  );
}
