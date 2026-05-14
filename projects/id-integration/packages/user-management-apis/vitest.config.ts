import { defineConfig } from 'vitest/config';

/**
 * Node で実行（`aws-sdk-client-mock` と Cognito SDK がそのまま使える）。
 * Worker 固有のテストが必要なら別プロジェクト／別 config で workers プールを使う。
 */
export default defineConfig({
  test: {
    setupFiles: ['tests/setup.ts'],
    pool: 'forks',
  },
});
