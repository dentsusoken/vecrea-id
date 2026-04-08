import { managementApis } from 'user-management-apis';


/**
 * Local development server using `@hono/node-server` (not Cloudflare Workers).
 */

import { serve } from '@hono/node-server';

serve(
  {
    fetch: managementApis.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
