import { Hono } from 'hono';
import { openApiRoutes } from './openapi';

const app = new Hono();

app.route('/', openApiRoutes);

app.get('/', (c) =>
  c.text('User Management API — OpenAPI: /openapi.json, UI: /docs')
);

export { app as managementApis };
export default app;
