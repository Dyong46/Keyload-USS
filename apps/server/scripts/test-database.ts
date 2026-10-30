import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const serverRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
dotenv.config({ path: path.join(serverRoot, '.env.test'), override: true });

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error('Create .env.test from .env.test.example first.');
}

const databaseUrl = new URL(rawUrl);
const databaseName = databaseUrl.pathname.replace(/^\//, '');

if (
  databaseName !== 'uss_test' ||
  databaseUrl.port !== '5433' ||
  !['127.0.0.1', 'localhost'].includes(databaseUrl.hostname)
) {
  throw new Error(
    'Refusing to run: test commands must target uss_test on localhost:5433.',
  );
}

const args = process.argv.slice(2);
if (args.length === 0) {
  throw new Error('A Prisma command is required.');
}

const prismaCli = path.join(serverRoot, 'node_modules/prisma/build/index.js');
const result = spawnSync(process.execPath, [prismaCli, ...args], {
  cwd: serverRoot,
  env: process.env,
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
