import React, { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import App, { Provider } from './App';
import { AuthGate } from './components/AuthGate';
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase';
import { SupabaseRepository, type SupabaseClientLike } from './supabase-repository';
import './style.css';

function Root() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <h1>Falta configurar Supabase</h1>
          <p role="alert" className="auth-error">
            Definí <code>NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
            <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> en <code>.env.local</code> o en las
            variables de entorno de tu hosting.
          </p>
        </section>
      </main>
    );
  }

  const supabase = getSupabaseClient();
  const repository = useMemo(
    () => new SupabaseRepository(supabase as unknown as SupabaseClientLike),
    [supabase],
  );

  return (
    <AuthGate auth={supabase.auth}>
      {({ userEmail, onSignOut }) => (
        <Provider repository={repository}>
          <App userEmail={userEmail} onSignOut={onSignOut} />
        </Provider>
      )}
    </AuthGate>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
