import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import type { User } from '../schemas';
import { createUserRoute } from './create-user';
import { deleteUserRoute } from './delete-user';
import { getUserRoute } from './get-user';
import { listUsersRoute } from './list-users';
import { patchUserRoute } from './patch-user';

/** Base OpenAPI document fields shared with `app.doc`. */
export const openApiInfo = {
  title: 'User Management API',
  version: '0.0.1',
  description:
    'Cognito-backed user CRUD-style operations (list, get, create, patch, delete). Wire to Admin* APIs in the hosting project.',
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

const mockUser = {
  userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  username: 'jdoe',
  email: 'jdoe@example.com',
  emailVerified: true,
  phoneNumber: null,
  phoneNumberVerified: undefined,
  enabled: true,
  status: 'CONFIRMED',
  mfaOptions: undefined,
  preferredMfaSetting: undefined,
  userMfaSettingList: undefined,
  createdAt: '2025-01-15T08:00:00.000Z',
  updatedAt: '2026-04-01T12:34:56.000Z',
  attributes: { given_name: 'Jane', family_name: 'Doe' },
} satisfies User;

app.openapi(listUsersRoute, (c) =>
  c.json(
    {
      items: [mockUser],
      paginationToken: undefined,
    },
    200
  )
);

app.openapi(createUserRoute, (c) => {
  const body = c.req.valid('json');
  return c.json(
    {
      ...mockUser,
      username: body.username,
      email: body.email ?? mockUser.email,
      attributes: body.attributes ?? mockUser.attributes,
    },
    201
  );
});

app.openapi(getUserRoute, (c) => {
  const { userId } = c.req.valid('param');
  return c.json({ ...mockUser, userId }, 200);
});

app.openapi(patchUserRoute, (c) => {
  c.req.valid('param');
  c.req.valid('json');
  return c.json(mockUser, 200);
});

app.openapi(deleteUserRoute, (c) => {
  c.req.valid('param');
  return c.body(null, 204);
});

app.doc('/openapi.json', {
  openapi: '3.0.3',
  info: { ...openApiInfo },
  servers: [...openApiServers],
});

app.get('/docs', swaggerUI({ url: '/openapi.json' }));

export { app as openApiRoutes };
