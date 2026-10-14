import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ShowsPage } from './shows-page.tsx';
import './styles.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('Missing #root element');
}
createRoot(root).render(
  <StrictMode>
    <ShowsPage />
  </StrictMode>,
);
