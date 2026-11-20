import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Lock, Mail, Wrench, AlertCircle } from 'lucide-react';
import './auth-gate.css';

export type AuthSessionLike = {
  user?: { email?: string | null } | null;
} | null;

export interface SupabaseAuthLike {
  getSession(): Promise<{
    data: { session: AuthSessionLike };
    error: { message: string } | null;
  }>;
  onAuthStateChange(
    callback: (event: string, session: AuthSessionLike) => void,
  ): { data: { subscription: { unsubscribe: () => void } } };
  signInWithPassword(credentials: {
    email: string;
    password: string;
  }): Promise<{ error: { message: string } | null }>;
  signOut(): Promise<{ error: { message: string } | null }>;
}

export function mapAuthError(error: { message?: string } | null | undefined): string {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (message.includes('email not confirmed')) {
    return 'El correo todavía no está confirmado en Supabase.';
  }
  if (message.includes('too many requests') || message.includes('rate limit')) {
    return 'Demasiados intentos. Esperá un momento y volvé a intentar.';
  }
  return 'No se pudo iniciar sesión. Revisá tu conexión y volvé a intentar.';
}

export function LoginView({
  email,
  password,
  busy,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  email: string;
  password: string;
  busy: boolean;
  error: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <div className="auth-brand__logo" aria-hidden="true">
            <Wrench size={20} strokeWidth={1.9} />
          </div>
          <div>
            <h1 id="auth-title">Rodrigo Repara</h1>
            <p>Acceso privado al panel de gestión</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="auth-email">Correo electrónico</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" aria-hidden="true" />
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={busy}
                placeholder="rodrigo@ejemplo.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Contraseña</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" aria-hidden="true" />
              <input
                id="auth-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={busy}
                placeholder="••••••••"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="auth-hint">
          Acceso restringido a usuarios autorizados en Supabase Authentication.
        </p>
      </section>
    </main>
  );
}

export function AuthGate({
  auth,
  initialSession,
  children,
}: {
  auth: SupabaseAuthLike;
  initialSession?: AuthSessionLike;
  children: (context: { userEmail: string; onSignOut: () => Promise<void> }) => ReactNode;
}) {
  const [session, setSession] = useState<AuthSessionLike>(initialSession ?? null);
  const [checking, setChecking] = useState(initialSession === undefined);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setSession(null);
        } else {
          setSession(data.session ?? null);
        }
        setChecking(false);
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setChecking(false);
      });

    const { data } = auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession ?? null);
      setChecking(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [auth]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Ingresá tu correo y contraseña.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { error: signInError } = await auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInError) {
        setError(mapAuthError(signInError));
      } else {
        setPassword('');
      }
    } catch {
      setError('No se pudo iniciar sesión. Revisá tu conexión y volvé a intentar.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await auth.signOut();
    } finally {
      setSession(null);
    }
  }

  if (checking) {
    return (
      <main className="auth-shell" aria-live="polite">
        <div className="auth-loading">Verificando sesión…</div>
      </main>
    );
  }

  if (!session) {
    return (
      <LoginView
        email={email}
        password={password}
        busy={busy}
        error={error}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
      />
    );
  }

  return <>{children({ userEmail: session.user?.email ?? '', onSignOut: handleSignOut })}</>;
}
