import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { getUserRoute } from './get-user';

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

const app = new OpenAPIHono();

app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description:
    'Cognito ID token or access token, depending on authorizer configuration.',
});

app.openapi(getUserRoute, (c) => {
  const { userId } = c.req.valid('param');
  return c.json(
    {
      userId,
      username: 'jdoe',
      email: 'jdoe@example.com',
      emailVerified: true,
      status: 'CONFIRMED',
      createdAt: '2025-01-15T08:00:00.000Z',
      updatedAt: '2026-04-01T12:34:56.000Z',
      attributes: { given_name: 'Jane', family_name: 'Doe' },
    },
    200
  );
});

app.doc('/openapi.json', {
  openapi: '3.0.3',
  info: { ...openApiInfo },
  servers: [...openApiServers],
});

app.get('/docs', swaggerUI({ url: '/openapi.json' }));

export { app as openApiRoutes };
