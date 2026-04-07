import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { openApiRoutes } from './openapi';

const app = new Hono();

app.route('/', openApiRoutes);

app.get('/', (c) =>
  c.text('User Management API — OpenAPI: /openapi.json, UI: /docs')
);

export const handler = handle(app);
export default app;
