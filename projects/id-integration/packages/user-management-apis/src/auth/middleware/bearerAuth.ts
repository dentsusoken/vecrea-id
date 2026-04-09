import type { IntrospectionResponse } from '@vecrea/au3te-ts-common/schemas.introspection';
import type { IntrospectionHandlerConfiguration } from '@vecrea/au3te-ts-server/handler.introspection';
import type { Context, MiddlewareHandler } from 'hono';

/**
 * Static introspection config or a per-request resolver (e.g. read from host
 * `c.get('au3teHandlers').introspection` after upstream middleware).
 */
export type IntrospectionConfigSource =
  | IntrospectionHandlerConfiguration
  | ((c: Context) => IntrospectionHandlerConfiguration);

function resolveIntrospectionConfig(
  source: IntrospectionConfigSource,
  c: Context
): IntrospectionHandlerConfiguration {
  return typeof source === 'function' ? source(c) : source;
}

const BEARER = 'Bearer ';

function extractBearerToken(
  authorizationHeader: string | undefined
): string | null {
  if (!authorizationHeader) return null;
  if (!authorizationHeader.startsWith(BEARER)) return null;
  const token = authorizationHeader.slice(BEARER.length).trim();
  return token === '' ? null : token;
}

function responseByAction(
  action: IntrospectionResponse['action']
): 400 | 401 | 403 | 500 {
  switch (action) {
    case 'BAD_REQUEST':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'INTERNAL_SERVER_ERROR':
      return 500;
    case 'OK':
      return 401;
    default:
      return 401;
  }
}

export function createBearerAuthMiddleware(
  introspectionConfig: IntrospectionConfigSource
): MiddlewareHandler {
  return async (c, next) => {
    const config = resolveIntrospectionConfig(introspectionConfig, c);
    const authorizationHeader = c.req.header('authorization');
    const token = extractBearerToken(authorizationHeader);
    if (!token) {
      return c.json({ message: 'Missing or invalid bearer token' }, 401);
    }

    let response: IntrospectionResponse;
    try {
      response = await config.processApiRequestWithValidation({
        token,
        htm: c.req.method,
        htu: c.req.url,
      });
    } catch (err) {
      console.error(err);
      return c.json({ message: 'Token introspection failed' }, 401);
    }

    if (response.action !== 'OK') {
      const status = responseByAction(response.action);
      const message =
        response.action === 'FORBIDDEN'
          ? 'Forbidden by token introspection'
          : 'Token introspection rejected the request';
      return c.json({ message }, status);
    }

    c.set('introspection', response);
    c.set('subject', response.subject ?? null);
    c.set('scopes', response.scopes ?? []);
    return next();
  };
}
