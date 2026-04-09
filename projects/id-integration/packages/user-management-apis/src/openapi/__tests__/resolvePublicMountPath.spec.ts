import { describe, expect, it, vi } from 'vitest';
import type { Context } from 'hono';
import {
  AU3TE_PUBLIC_PATH_PREFIX_ENV,
  USER_MANAGEMENT_PUBLIC_PATH_PREFIX_ENV,
  computePathPrefixBeforeMount,
  resolvePublicDocsPath,
  resolvePublicOpenApiJsonPath,
  resolvePublicPathPrefix,
  resolvePublicServersPath,
} from '../resolvePublicMountPath';

function mockCtx(
  pathname: string,
  init?: { stage?: string; header?: Record<string, string> }
): Context {
  const url = `https://api.example.com${pathname}`;
  return {
    req: {
      url,
      header: (name: string) => init?.header?.[name.toLowerCase()],
    },
    env: init?.stage
      ? { event: { requestContext: { stage: init.stage } } }
      : {},
  } as Context;
}

describe('resolvePublicMountPath', () => {
  it('computePathPrefixBeforeMount extracts segment before mount', () => {
    expect(computePathPrefixBeforeMount('/prod/manage/docs', '/manage')).toBe(
      '/prod'
    );
    expect(computePathPrefixBeforeMount('/manage/docs', '/manage')).toBe('');
  });

  it('uses API Gateway stage when path has no stage prefix', () => {
    const c = mockCtx('/manage/docs', { stage: 'prod' });
    expect(resolvePublicPathPrefix(c, '/manage', undefined)).toBe('/prod');
    expect(resolvePublicOpenApiJsonPath(c, '/manage', undefined)).toBe(
      '/prod/manage/openapi.json'
    );
    expect(resolvePublicDocsPath(c, '/manage', undefined)).toBe(
      '/prod/manage/docs'
    );
    expect(resolvePublicServersPath(c, '/manage', undefined)).toBe(
      '/prod/manage'
    );
  });

  it('prefers AU3TE_PUBLIC_PATH_PREFIX from getEnv over stage', () => {
    const c = mockCtx('/manage/docs', { stage: 'prod' });
    const getEnv = () => ({ [AU3TE_PUBLIC_PATH_PREFIX_ENV]: '/custom' });
    expect(
      resolvePublicOpenApiJsonPath(c, '/manage', { getEnv })
    ).toBe('/custom/manage/openapi.json');
  });

  it('reads USER_MANAGEMENT_PUBLIC_PATH_PREFIX from process.env', () => {
    vi.stubEnv(USER_MANAGEMENT_PUBLIC_PATH_PREFIX_ENV, '/stg');
    const c = mockCtx('/manage/openapi.json');
    try {
      expect(resolvePublicPathPrefix(c, '/manage', undefined)).toBe('/stg');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('uses X-Forwarded-Prefix when nothing else applies', () => {
    const c = mockCtx('/manage/docs', {
      header: { 'x-forwarded-prefix': '/edge' },
    });
    expect(resolvePublicPathPrefix(c, '/manage', undefined)).toBe('/edge');
  });
});
