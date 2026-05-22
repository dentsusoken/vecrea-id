'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'aws-amplify/auth'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/users', label: 'ユーザー管理' },
  { href: '/staging', label: 'ステージング' },
  { href: '/settings', label: '設定' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white">
      <div className="h-16 flex items-center px-5 border-b border-gray-200">
        <span className="font-semibold text-gray-900 text-sm">ユーザー管理コンソール</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ログアウト
        </button>
      </div>
    </aside>
  )
}
