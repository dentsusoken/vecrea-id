import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { handle } from 'hono/aws-lambda';
import { getUserRoute } from './openapi/get-user';
import { openApiInfo, openApiServers } from './openapi/index';

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

app.get('/', (c) =>
  c.text('User Management API — OpenAPI: /openapi.json, UI: /docs')
);

export const handler = handle(app);
export default app;
