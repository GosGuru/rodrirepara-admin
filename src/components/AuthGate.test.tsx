import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthGate, LoginView, mapAuthError, type SupabaseAuthLike } from './AuthGate';

function createFakeAuth(email: string | null = null): SupabaseAuthLike {
  return {
    async getSession() {
      return {
        data: { session: email ? { user: { email } } : null },
        error: null,
      };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async signInWithPassword() {
      return { error: null };
    },
    async signOut() {
      return { error: null };
    },
  };
}

describe('AuthGate & LoginView', () => {
  test('renders loading state before session resolves', () => {
    const html = renderToStaticMarkup(
      <AuthGate auth={createFakeAuth(null)}>{() => <div>CRM Privado</div>}</AuthGate>,
    );
    expect(html).toContain('Verificando sesión');
    expect(html).not.toContain('CRM Privado');
  });

  test('renders login form without public sign-up when unauthenticated', () => {
    const html = renderToStaticMarkup(
      <LoginView
        email=""
        password=""
        busy={false}
        error="Correo o contraseña incorrectos."
        onEmailChange={() => {}}
        onPasswordChange={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(html).toContain('Rodrigo Repara');
    expect(html).toContain('Iniciar sesión');
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).toContain('Correo o contraseña incorrectos.');
    expect(html).not.toContain('Crear cuenta');
    expect(html).not.toContain('Registrarse');
  });

  test('renders protected children immediately when initialSession is present', () => {
    const html = renderToStaticMarkup(
      <AuthGate auth={createFakeAuth('rodrigo@ejemplo.com')} initialSession={{ user: { email: 'rodrigo@ejemplo.com' } }}>
        {({ userEmail }) => <div>CRM Privado: {userEmail}</div>}
      </AuthGate>,
    );
    expect(html).toContain('CRM Privado: rodrigo@ejemplo.com');
  });

  test('maps Supabase auth errors into clear Spanish messages', () => {
    expect(mapAuthError({ message: 'Invalid login credentials' })).toBe(
      'Correo o contraseña incorrectos.',
    );
    expect(mapAuthError({ message: 'Email not confirmed' })).toBe(
      'El correo todavía no está confirmado en Supabase.',
    );
    expect(mapAuthError({ message: 'Too many requests' })).toBe(
      'Demasiados intentos. Esperá un momento y volvé a intentar.',
    );
    expect(mapAuthError({ message: 'Internal failure stacktrace' })).toBe(
      'No se pudo iniciar sesión. Revisá tu conexión y volvé a intentar.',
    );
  });
});
