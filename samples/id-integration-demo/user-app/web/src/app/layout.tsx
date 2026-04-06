import type { ReactNode } from 'react'

import './globals.css'

import { AppHeader } from '../components/AppHeader'

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-zinc-50 text-zinc-900">
        <div className="flex min-h-screen flex-col">
          <AppHeader />
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
      </body>
    </html>
  )
}
