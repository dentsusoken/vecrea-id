export { getUserRoute } from './get-user';

/** Base OpenAPI document fields shared with `app.doc`. */
export const openApiInfo = {
  title: 'User Management API — Get user',
  version: '0.0.1',
  description:
    'Returns a single user profile. Intended for API Gateway + Lambda (e.g. Hono) behind Cognito or similar.',
} as const;

export const openApiServers = [
  {
    url: 'https://api.example.com/v1',
    description: 'Replace with your stage URL',
  },
] as const;
