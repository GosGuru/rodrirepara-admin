import React from 'react';
import { createRoot } from 'react-dom/client';
import App, { Provider } from './App';
import { JsonRepository } from './repository';
import './style.css';

// Defer the localStorage getter until the repository's guarded async load.
const repository = new JsonRepository(() => window.localStorage);
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider repository={repository}><App /></Provider>
  </React.StrictMode>,
);
