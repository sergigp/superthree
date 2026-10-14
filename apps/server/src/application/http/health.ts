import { Hono } from 'hono';

export function createHealthRoutes() {
  return new Hono().get('/', (c) => c.json({ status: 'ok' }, 200));
}
