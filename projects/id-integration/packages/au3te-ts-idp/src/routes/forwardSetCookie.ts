import type { Context } from 'hono';
import type { CookieOptions } from 'hono/utils/cookie';
import { setCookie } from 'hono/cookie';

/**
 * `Set-Cookie` 1 行を name / value / Hono の `CookieOptions` に分解する（RFC 6265 の一般的な形向け）。
 */
function parseSetCookieLine(line: string): {
  name: string;
  value: string;
  opt: CookieOptions;
} | null {
  const segments = line
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    return null;
  }
  const [first, ...attrs] = segments;
  const eq = first.indexOf('=');
  if (eq <= 0) {
    return null;
  }
  const name = first.slice(0, eq).trim();
  let value = first.slice(eq + 1).trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }
  try {
    value = decodeURIComponent(value);
  } catch {
    /* そのまま */
  }

  const opt: CookieOptions = {};
  for (const a of attrs) {
    const i = a.indexOf('=');
    const key = (i === -1 ? a : a.slice(0, i)).trim().toLowerCase();
    const v = i === -1 ? '' : a.slice(i + 1).trim();
    if (key === 'httponly') {
      opt.httpOnly = true;
    } else if (key === 'secure') {
      opt.secure = true;
    } else if (key === 'partitioned') {
      opt.partitioned = true;
    } else if (key === 'path' && v) {
      opt.path = v;
    } else if (key === 'domain' && v) {
      opt.domain = v;
    } else if (key === 'max-age' && v) {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n)) {
        opt.maxAge = n;
      }
    } else if (key === 'expires' && v) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) {
        opt.expires = d;
      }
    } else if (key === 'samesite' && v) {
      const s = v.toLowerCase();
      if (s === 'strict' || s === 'lax' || s === 'none') {
        opt.sameSite = s;
      }
    }
  }

  return { name, value, opt };
}

/**
 * upstream `Response` の `Set-Cookie` を Hono の `setCookie` 経由で `c` に載せる。
 * その後 `return c.render(...)` など **Context から生成する応答** を返すとヘッダーがマージされる。
 */
export function applyUpstreamSetCookiesToContext(c: Context, upstream: Response): void {
  const raw =
    typeof upstream.headers.getSetCookie === 'function'
      ? upstream.headers.getSetCookie()
      : [];
  const lines =
    raw.length > 0
      ? raw
      : (() => {
          const one = upstream.headers.get('set-cookie');
          return one != null ? [one] : [];
        })();

  for (const line of lines) {
    if (!line) {
      continue;
    }
    const parsed = parseSetCookieLine(line);
    if (parsed == null) {
      c.header('Set-Cookie', line, { append: true });
      continue;
    }
    try {
      setCookie(c, parsed.name, parsed.value, parsed.opt);
    } catch {
      c.header('Set-Cookie', line, { append: true });
    }
  }
}
