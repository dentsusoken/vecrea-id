import type { ReactNode } from 'react'

import { AppHeader } from '../../components/AppHeader'

export default function MainLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}
