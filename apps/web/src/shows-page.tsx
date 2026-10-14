import { AudioLanguage } from '@superthree/domain/show/audio-language';
import { useEffect, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { api } from './api.ts';

type ShowRow = Awaited<ReturnType<Awaited<ReturnType<typeof api.api.shows.$get>>['json']>>[number];

const ErrorBody = z.object({ error: z.string() });

export function ShowsPage() {
  const [shows, setShows] = useState<ShowRow[]>([]);
  const [name, setName] = useState('');
  const [audioLanguage, setAudioLanguage] = useState<AudioLanguage>('ca');
  const [error, setError] = useState<string | undefined>(undefined);

  const refresh = async () => {
    const response = await api.api.shows.$get();
    setShows(await response.json());
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handle = async (response: Response, onSuccess: () => void) => {
    if (response.ok) {
      setError(undefined);
      onSuccess();
      await refresh();
    } else {
      setError(await errorMessage(response));
    }
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    await handle(await api.api.shows.$post({ json: { name, audioLanguage } }), () => setName(''));
  };

  const changeLanguage = async (id: string, language: AudioLanguage) => {
    await handle(await api.api.shows[':id'].$patch({ param: { id }, json: { audioLanguage: language } }), () => {});
  };

  const remove = async (show: ShowRow) => {
    if (window.confirm(`Delete ${show.name}?`)) {
      await handle(await api.api.shows[':id'].$delete({ param: { id: show.id } }), () => {});
    }
  };

  return (
    <main>
      <h1>Shows</h1>
      <form onSubmit={(event) => void add(event)}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
        <LanguageSelect value={audioLanguage} onChange={setAudioLanguage} />
        <button type="submit">Add</button>
      </form>
      {error !== undefined && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Audio language</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {shows.map((show) => (
            <tr key={show.id}>
              <td>{show.name}</td>
              <td>
                <LanguageSelect value={show.audioLanguage} onChange={(language) => void changeLanguage(show.id, language)} />
              </td>
              <td>{new Date(show.createdAt).toLocaleString()}</td>
              <td>
                <button type="button" onClick={() => void remove(show)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function LanguageSelect({ value, onChange }: { value: AudioLanguage; onChange: (language: AudioLanguage) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(AudioLanguage.parse(event.target.value))}>
      {AudioLanguage.options.map((language) => (
        <option key={language} value={language}>
          {language}
        </option>
      ))}
    </select>
  );
}

async function errorMessage(response: Response): Promise<string> {
  const body = ErrorBody.safeParse(await response.json().catch(() => undefined));
  return body.success ? body.data.error : `Request failed with status ${response.status}`;
}
