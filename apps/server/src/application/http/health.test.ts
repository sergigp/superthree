import { expect, it } from 'vitest';
import { createHealthRoutes } from './health.ts';

it('should report the server is up', async () => {
  const app = createHealthRoutes();

  const response = await app.request('/');

  expect({ status: response.status, body: await response.json() }).toEqual({ status: 200, body: { status: 'ok' } });
});
