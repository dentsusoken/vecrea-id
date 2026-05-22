import { fetchAuthSession } from 'aws-amplify/auth/server'
import { type NextRequest, NextResponse } from 'next/server'
import { runWithAmplifyServerContext } from './lib/amplify-server-utils'

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isLogin = pathname === '/login'
  const isApi = pathname.startsWith('/api/')

  // ローカル開発時に認証をスキップ
  if (process.env.SKIP_AUTH === 'true') {
    if (isLogin) return NextResponse.redirect(new URL('/users', request.url))
    return NextResponse.next()
  }

  const response = NextResponse.next()

  let isAuthenticated = false
  try {
    await runWithAmplifyServerContext({
      nextServerContext: { request, response },
      operation: async (ctx) => {
        const session = await fetchAuthSession(ctx)
        isAuthenticated = !!session.tokens
      },
    })
  } catch {
    isAuthenticated = false
  }

  if (!isAuthenticated && !isLogin) {
    if (isApi) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthenticated && isLogin) {
    return NextResponse.redirect(new URL('/users', request.url))
  }

  return response
}
