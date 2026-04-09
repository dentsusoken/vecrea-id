import type { UserHandlerConfiguration } from '@vecrea/au3te-ts-common/handler.user';
import { UserHandlerConfigurationImpl } from '@vecrea/au3te-ts-common/handler.user';
import { ApiClientImpl } from '@vecrea/au3te-ts-server/api';
import { ServerHandlerConfigurationImpl } from '@vecrea/au3te-ts-server/handler.core';
import {
  Session,
  DefaultSessionSchemas,
} from '@vecrea/au3te-ts-server/session';
import type { Context } from 'hono';
import { readAu3teApiClientConfig } from '../config/readAu3teApiClientConfig';
import { createEphemeralAu3teSession } from '../session/createAu3teSession';

export type ServerDeps = {
  apiClient: ApiClientImpl;
  session: Session<DefaultSessionSchemas>;
  serverHandler: ServerHandlerConfigurationImpl<DefaultSessionSchemas>;
  /** ユーザー永続化の実装（DynamoDB 等）。トークン・認可フローで利用する */
  userHandlerConfiguration: UserHandlerConfiguration;
};

export type CreateServerDepsOptions = {
  /**
   * 同一プロセスで使い回す API クライアント。
   * 省略時は毎回生成（ミドルウェアでリクエストごとに組み立てる場合はここで共有可能）。
   */
  apiClient?: ApiClientImpl;
  /**
   * `Session` の具象（DynamoDB / 別KV / メモリ等）。
   * 省略時はインスタンス専用セッション（{@link createEphemeralAu3teSession}）。
   */
  session?: Session<DefaultSessionSchemas>;
  /**
   * ユーザー取得・更新の実装。省略時は開発向けの {@link UserHandlerConfigurationImpl}（インメモリ）。
   * 本番では DynamoDB 等にバックした実装を渡す。
   */
  userHandlerConfiguration?: UserHandlerConfiguration;
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
  const apiClient =
    options?.apiClient ?? new ApiClientImpl(readAu3teApiClientConfig(c));

  const session =
    options?.session ?? createEphemeralAu3teSession();

  const userHandlerConfiguration =
    options?.userHandlerConfiguration ?? new UserHandlerConfigurationImpl();

  const serverHandler = new ServerHandlerConfigurationImpl(apiClient, session);

  return {
    apiClient,
    session,
    serverHandler,
    userHandlerConfiguration,
  };
}
