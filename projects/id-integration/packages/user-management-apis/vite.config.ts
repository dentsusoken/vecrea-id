import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    target: 'node20',
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(rootDir, 'src/index.ts'),
      name: 'user-management-api',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        '@aws-sdk/client-cognito-identity-provider',
        'hono',
        '@hono/swagger-ui',
        '@hono/zod-openapi',
        'zod',
      ],
    },
  },
  plugins: [
    dts({
      rollupTypes: false,
      exclude: ['./src/**/__tests__/*.*'],
    }),
  ],
});
