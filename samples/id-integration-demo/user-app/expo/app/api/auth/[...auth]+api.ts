import { auth } from "@/lib/auth";

const handler = auth.handler;

function logAuthApi(req: Request) {
  if (typeof __DEV__ !== "undefined" && !__DEV__) return;
  try {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/auth")) return;
    const cookie = req.headers.get("cookie") ?? "";
    console.log("[auth/api]", req.method, url.pathname, {
      host: req.headers.get("host"),
      origin: req.headers.get("origin"),
      hasCookie: Boolean(cookie),
      cookieLen: cookie.length,
      hasSessionTokenCookie: cookie.includes("session_token"),
      userAgent: req.headers.get("user-agent"),
    });
  } catch {
    // ignore
  }
}

export async function GET(req: Request) {
  logAuthApi(req);
  const res = await handler(req);
  try {
    const url = new URL(req.url);
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      if (
        url.pathname.startsWith("/api/auth/oauth2/callback") ||
        url.pathname.startsWith("/api/auth/expo-authorization-proxy") ||
        url.pathname.startsWith("/api/auth/sign-in") ||
        url.pathname.startsWith("/api/auth/sign-out")
      ) {
        const location = res.headers.get("location");
        const setCookie = res.headers.get("set-cookie") ?? "";
        const locationPreview =
          location && location.length > 160 ? `${location.slice(0, 160)}…` : location;
        console.log("[auth/api:res]", url.pathname, {
          status: res.status,
          hasLocation: Boolean(location),
          locationLen: location?.length ?? 0,
          locationScheme: location
            ? (() => {
                try {
                  return new URL(location).protocol;
                } catch {
                  return null;
                }
              })()
            : null,
          locationHasCookieParam: Boolean(location?.includes("cookie=")),
          locationPreview,
          hasSetCookie: Boolean(setCookie),
          setCookieLen: setCookie.length,
          setCookieHasSessionToken: setCookie.includes("session_token"),
        });
      }
    }
  } catch {
    // ignore
  }
  return res;
}

export async function POST(req: Request) {
  logAuthApi(req);
  const res = await handler(req);
  try {
    const url = new URL(req.url);
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      if (
        url.pathname.startsWith("/api/auth/oauth2/callback") ||
        url.pathname.startsWith("/api/auth/expo-authorization-proxy") ||
        url.pathname.startsWith("/api/auth/sign-in") ||
        url.pathname.startsWith("/api/auth/sign-out")
      ) {
        const location = res.headers.get("location");
        const setCookie = res.headers.get("set-cookie") ?? "";
        const locationPreview =
          location && location.length > 160 ? `${location.slice(0, 160)}…` : location;
        console.log("[auth/api:res]", url.pathname, {
          status: res.status,
          hasLocation: Boolean(location),
          locationLen: location?.length ?? 0,
          locationScheme: location
            ? (() => {
                try {
                  return new URL(location).protocol;
                } catch {
                  return null;
                }
              })()
            : null,
          locationHasCookieParam: Boolean(location?.includes("cookie=")),
          locationPreview,
          hasSetCookie: Boolean(setCookie),
          setCookieLen: setCookie.length,
          setCookieHasSessionToken: setCookie.includes("session_token"),
        });
      }
    }
  } catch {
    // ignore
  }
  return res;
}
