import { ApiClientImpl } from '@vecrea/au3te-ts-server/api';
import { ServerHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.core';
import {
  Session,
  DefaultSessionSchemas,
} from '@vecrea/au3te-ts-server/session';
import type { Context } from 'hono';
import { readAu3teApiClientConfig } from '../config/readAu3teApiClientConfig';
import { createInMemoryAu3teSession } from '../session/createInMemoryAu3teSession';

export type ServerDeps = {
  apiClient: ApiClientImpl;
  session: Session<DefaultSessionSchemas>;
  serverHandler: ServerHandlerConfigurationImpl<DefaultSessionSchemas>;
};

export type CreateServerDepsOptions = {
  /**
   * `Session` の具象（DynamoDB / 別KV / メモリ等）。
   * 省略時はプロセス内メモリ（{@link createInMemoryAu3teSession}）。
   */
  session?: Session<DefaultSessionSchemas>;
};

/**
 * Authlete 互換 API 向けのクライアント・セッション・共通ハンドラー設定を組み立てる。
 * 設定値は {@link readAu3teApiClientConfig} 経由（Hono `env`）で取得する。
 *
 * Cloudflare Workers では `c.env` が必要なため、ミドルウェア内で `createServerDeps(c)` のように Context を渡す。
 */
export function createServerDeps(
  c?: Context,
  options?: CreateServerDepsOptions
): ServerDeps {
  const apiClient = new ApiClientImpl(readAu3teApiClientConfig(c));

  const session = options?.session ?? createInMemoryAu3teSession();

  const serverHandler = new ServerHandlerConfigurationImpl(apiClient, session);

  return { apiClient, session, serverHandler };
}
