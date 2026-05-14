import { env, getRuntimeKey } from 'hono/adapter';

/** Same as previous inline helpers: Node "other" runtime still exposes process.env */
export function resolveEnvRuntime(): Parameters<typeof env>[1] {
  const key = getRuntimeKey();
  if (
    key === 'other' &&
    typeof globalThis.process !== 'undefined' &&
    globalThis.process.env &&
    typeof globalThis.process.env === 'object'
  ) {
    return 'node';
  }
  return key;
}
