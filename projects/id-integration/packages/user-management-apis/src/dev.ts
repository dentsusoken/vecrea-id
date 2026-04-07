import { serve } from '@hono/node-server';
import { managementApis } from './index';

serve(
  {
    fetch: managementApis.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
