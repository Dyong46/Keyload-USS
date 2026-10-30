import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

const serverRoot = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(serverRoot, '.env.test'), override: true });

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error('Create .env.test from .env.test.example first.');

const databaseUrl = new URL(rawUrl);
if (
  databaseUrl.pathname !== '/uss_test' ||
  databaseUrl.port !== '5433' ||
  !['127.0.0.1', 'localhost'].includes(databaseUrl.hostname)
) {
  throw new Error(
    'Refusing integration tests: DATABASE_URL must target uss_test on localhost:5433.',
  );
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.integration-spec.ts'],
    fileParallelism: false,
  },
});
