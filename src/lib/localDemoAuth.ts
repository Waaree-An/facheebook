import type { Session } from '@supabase/supabase-js';

const LOCAL_DEMO_SESSION_KEY = 'fachee_local_demo_session';
const LOCAL_DEMO_EMAIL = 'demo@facheebook.local';

function createDemoUserId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return '11111111-1111-4111-8111-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0');
}

export function createLocalDemoSession(name = 'Demo Student'): Session {
  const now = new Date();
  const expiresAt = Math.floor(now.getTime() / 1000) + 60 * 60;

  return {
    access_token: 'local-demo-access-token',
    refresh_token: 'local-demo-refresh-token',
    expires_in: 60 * 60,
    expires_at: expiresAt,
    token_type: 'bearer',
    user: {
      id: createDemoUserId(),
      email: LOCAL_DEMO_EMAIL,
      app_metadata: { provider: 'local-demo', providers: ['local-demo'] },
      user_metadata: { first_name: name.trim() || 'Demo Student' },
      aud: 'authenticated',
      created_at: now.toISOString(),
    },
  } as Session;
}

export function isLocalDemoSession(session: Session | null | undefined): boolean {
  if (!session?.user) return false;
  return (
    session.user.email === LOCAL_DEMO_EMAIL &&
    session.user.app_metadata?.provider === 'local-demo'
  );
}

export function getStoredLocalDemoSession(): Session | null {
  try {
    const raw = localStorage.getItem(LOCAL_DEMO_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session | null;
    return isLocalDemoSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setStoredLocalDemoSession(session: Session): void {
  try {
    localStorage.setItem(LOCAL_DEMO_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage failures in private browsing or locked-down contexts.
  }
}

export function clearStoredLocalDemoSession(): void {
  try {
    localStorage.removeItem(LOCAL_DEMO_SESSION_KEY);
  } catch {
    // Ignore storage failures in private browsing or locked-down contexts.
  }
}
