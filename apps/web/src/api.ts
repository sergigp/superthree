import type { AppType } from '@superthree/server/app';
import { hc } from 'hono/client';

export const api = hc<AppType>('/');
