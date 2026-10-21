import React, { createContext, useContext, useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';

type AuthContextValue = { session: Session | null; signOut: () => Promise<void> };
type AuthMode = 'signin' | 'signup' | 'reset' | 'update_password';
const AuthContext = createContext<AuthContextValue | null>(null);
export function useFacheeAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useFacheeAuth must be used inside AuthGate');
  return value;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [localMode, setLocalMode] = useState(false);
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data, error: sessionLoadError }) => {
      if (!alive) return;
      if (sessionLoadError) setSessionError('We could not restore your saved sign-in. Please sign in again.');
      setSession(data.session);
      setChecking(false);
    }).catch((caught: unknown) => {
      if (!alive) return;
      console.error('Could not restore the FacheeBook session', caught);
      setSessionError('We could not restore your saved sign-in. Please sign in again.');
      setChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update_password');
        setPassword('');
        setConfirmPassword('');
        setMessage('');
        setError('');
      }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    try {
      localStorage.removeItem('fachee_student_profile');
    } catch (error) {
      console.warn('Could not clear the cached student profile after sign-out', error);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
    setMessage('');
  };

  const friendlyAuthError = (caught: unknown) => {
    const detail = caught instanceof Error ? caught.message : '';
    if (/invalid login credentials/i.test(detail)) return 'That email and password do not match. Check them or reset your password.';
    if (/email not confirmed/i.test(detail)) return 'Confirm your email using the link we sent, then try signing in again.';
    if (/user already registered/i.test(detail)) return 'An account may already exist for this email. Try signing in or resetting your password.';
    if (/password.*(weak|characters|length)/i.test(detail)) return 'Choose a longer password that meets the account requirements.';
    return detail || 'Something went wrong. Please try again.';
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setMessage('');
    if ((mode === 'signup' || mode === 'update_password') && password !== confirmPassword) {
      setError('The passwords do not match. Please check both fields.');
      return;
    }
    setBusy(true);
    try {
      if (!supabase) throw new Error('Supabase is not configured. Create .env.local using the project instructions, then restart the app.');
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(), password,
          options: { data: { first_name: firstName.trim() }, emailRedirectTo: window.location.origin },
        });
        if (authError) throw authError;
        setPassword('');
        setConfirmPassword('');
        if (data.session) {
          setMessage('Your account is ready. Opening your study library…');
        } else {
          changeMode('signin');
          setMessage('Account created. Check your email for the confirmation link, then sign in here.');
        }
      } else if (mode === 'reset') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: window.location.origin });
        if (authError) throw authError;
        setMessage('If an account exists for that email, a password-reset link has been sent.');
      } else if (mode === 'update_password') {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setPassword('');
        setConfirmPassword('');
        setMode('signin');
        setMessage('Your password has been updated. Opening your study library…');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (authError) throw authError;
      }
    } catch (caught) {
      console.error('FacheeBook authentication request failed', caught);
      setError(friendlyAuthError(caught));
    } finally { setBusy(false); }
  }

  if (checking) return <AuthShell><p role="status" className="text-sm text-stone-300">Checking your secure session…</p></AuthShell>;
  if (!isSupabaseConfigured || !supabase) {
    if (localMode) {
      // Keep the complete local study experience available even if cloud settings
      // are missing. This mode never pretends that cloud sync is active.
      return <AuthContext.Provider value={{ session: null, signOut: async () => {} }}>{children}</AuthContext.Provider>;
    }
    return <AuthShell>
      <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Cloud setup needed</p>
      <h1 className="mt-3 text-3xl font-bold">Connect your cloud account</h1>
      <p className="mt-3 text-sm leading-6 text-stone-300">Cloud sign-in is unavailable until FacheeBook detects your environment settings. Your local study library can still be opened safely.</p>
      <div className="mt-5 rounded-xl border border-amber-300/30 bg-black/20 p-4 text-left text-sm text-stone-200">
        <p>1. Check that <code>.env.local</code> is beside <code>package.json</code>.</p>
        <p className="mt-2">2. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.</p>
        <p className="mt-2">3. Restart <code>npm run dev</code> and refresh the page.</p>
      </div>
      <button type="button" onClick={() => setLocalMode(true)} className="mt-5 w-full rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 font-bold text-amber-200 transition hover:bg-amber-300/20">Continue with local library</button>
      <p className="mt-3 text-xs leading-5 text-stone-500">Local mode keeps existing study features available on this device. Account access and cloud syncing remain unavailable until configured.</p>
    </AuthShell>;
  }

  if (session && mode !== 'update_password') return <AuthContext.Provider value={{ session, signOut }}>{children}</AuthContext.Provider>;

  return <AuthShell>
    <div className="mb-7 flex items-center justify-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-300/10 text-xl font-black text-amber-300">F</div>
      <div className="text-left"><p className="text-2xl font-extrabold tracking-tight">Fachee<span className="text-amber-300">Book</span></p><p className="text-xs text-stone-300">Your study space, synced securely</p></div>
    </div>
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">{mode === 'signup' ? 'Join your study space' : mode === 'reset' ? 'Account recovery' : mode === 'update_password' ? 'Secure your account' : 'Student sign in'}</p>
    <h1 className="mt-2 text-2xl font-bold">{mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : mode === 'update_password' ? 'Choose a new password' : 'Welcome back'}</h1>
    <p className="mt-2 text-sm leading-6 text-stone-300">{mode === 'signup' ? 'Create an account to access your study space.' : mode === 'reset' ? 'Enter your account email and we’ll send a secure reset link.' : mode === 'update_password' ? 'Choose a new password to finish recovering your account.' : 'Sign in to continue to your study library.'}</p>
    <form className="mt-6 space-y-4 text-left" onSubmit={submit} noValidate={false}>
      {sessionError && <p role="status" className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">{sessionError}</p>}
      {mode === 'signup' && <label className="block text-sm font-semibold text-stone-200">First name<input value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" className={fieldClass} placeholder="Your first name" required disabled={busy} /></label>}
      {mode !== 'update_password' && <label className="block text-sm font-semibold text-stone-200">Email address<input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" className={fieldClass} placeholder="you@example.com" required disabled={busy} /></label>}
      {mode !== 'reset' && (
        <>
          <label className="block text-sm font-semibold text-stone-200">{mode === 'update_password' ? 'New password' : 'Password'}
            <span className="relative mt-2 block">
              <input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className={`${fieldClass} mt-0 pr-12`} placeholder={mode === 'signin' ? 'Enter your password' : 'At least 6 characters'} minLength={6} required disabled={busy} />
              <button type="button" onClick={() => setShowPassword(value => !value)} disabled={busy} className="absolute inset-y-0 right-2 flex w-10 items-center justify-center rounded-lg text-stone-300 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-50" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {(mode === 'signup' || mode === 'update_password') && <label className="block text-sm font-semibold text-stone-200">Confirm password<input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="new-password" className={fieldClass} placeholder="Enter the password again" minLength={6} required disabled={busy} /></label>}
        </>
      )}
      {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-950/40 p-3 text-sm leading-5 text-red-100">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-950/30 p-3 text-sm leading-5 text-emerald-100">{message}</p>}
      <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 font-bold text-stone-950 transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60">
        {busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-950/30 border-t-stone-950" />Please wait…</> : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : mode === 'update_password' ? 'Update password' : 'Sign in'}
      </button>
    </form>
    <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm">
      {mode !== 'signin' && mode !== 'update_password' && <button type="button" disabled={busy} className="font-semibold text-stone-200 underline decoration-stone-500 underline-offset-4 hover:text-amber-200 disabled:opacity-50" onClick={() => changeMode('signin')}>Back to sign in</button>}
      {mode === 'signin' && <><button type="button" disabled={busy} className="font-semibold text-stone-200 underline decoration-stone-500 underline-offset-4 hover:text-amber-200 disabled:opacity-50" onClick={() => changeMode('signup')}>Create account</button><button type="button" disabled={busy} className="font-semibold text-stone-200 underline decoration-stone-500 underline-offset-4 hover:text-amber-200 disabled:opacity-50" onClick={() => changeMode('reset')}>Forgot password?</button></>}
    </div>
    <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-5 text-stone-300">Your study materials stay on this device unless cloud sync is enabled. Never share your password or secret API keys.</p>
  </AuthShell>;
}

const fieldClass = 'mt-2 block w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-base text-white placeholder:text-stone-400 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20 disabled:opacity-60';
function AuthShell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(244,199,91,.10),transparent_55%),#080a0b] px-4 py-8 text-stone-100"><section className="w-full max-w-md rounded-3xl border border-amber-300/25 bg-[#111619] p-6 shadow-2xl shadow-black/40 sm:p-8">{children}</section></main>;
}
