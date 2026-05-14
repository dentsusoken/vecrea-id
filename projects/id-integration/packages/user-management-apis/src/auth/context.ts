import type { IntrospectionResponse } from '@vecrea/au3te-ts-common/schemas.introspection';

declare module 'hono' {
  interface ContextVariableMap {
    introspection: IntrospectionResponse;
    subject: string | null;
    scopes: string[];
  }
}
