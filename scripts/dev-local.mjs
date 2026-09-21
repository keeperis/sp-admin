import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

// Keep secrets on the server; reuse the local API's internal proxy token.
try {
  process.loadEnvFile('../sp-api/.env.local');
} catch {
  /* Existing environment may supply it. */
}
try {
  process.loadEnvFile('.env.local');
} catch {
  /* Optional admin overrides. */
}
if (!process.env.INTERNAL_ADMIN_API_TOKEN)
  throw new Error('Configure INTERNAL_ADMIN_API_TOKEN in sp-api/.env.local or the environment.');
const api = new URL(process.env.API_BASE_URL || 'http://127.0.0.1:4100');
if (!['localhost', '127.0.0.1', '[::1]'].includes(api.hostname))
  throw new Error('Local no-auth mode must use a local sp-api server.');
console.info(
  'LOCAL ONLY: admin login disabled; listening on 127.0.0.1:3000. Production authentication is unchanged.',
);
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '-p', '3000', '--hostname', '127.0.0.1'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      LOCAL_ADMIN_NO_AUTH: '1',
      API_BASE_URL: api.origin,
      NEXTAUTH_URL: 'http://127.0.0.1:3000',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || randomBytes(32).toString('hex'),
    },
  },
);
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
child.on('exit', (code) => process.exit(code ?? 0));
