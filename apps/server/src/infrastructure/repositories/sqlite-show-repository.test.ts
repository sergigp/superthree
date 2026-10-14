import { Show } from '@superthree/domain/show/show';
import { expect, it } from 'vitest';
import { testDatabase } from '../shared/test-database.ts';
import { createSqliteShowRepository } from './sqlite-show-repository.ts';

it('should reject inserting a name that differs only in case', async () => {
  const shows = createSqliteShowRepository(await testDatabase());
  await shows.insert(aShow('11111111-1111-4111-8111-000000000001', 'Bluey'));

  await expect(shows.insert(aShow('11111111-1111-4111-8111-000000000002', 'BLUEY'))).rejects.toThrow(
    'UNIQUE constraint failed: shows.name',
  );
});

function aShow(id: string, name: string): Show {
  return Show.parse({ id, name, audioLanguage: 'en', createdAt: '2026-10-01T09:00:00.000Z' });
}
