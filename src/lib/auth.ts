import { createClient, type Session, type User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

/**
 * CARVERSE auth — thin wrapper over Supabase Auth (email + password).
 * The publishable anon key is safe to ship in the browser; Row Level Security
 * on the project guards everything server-side.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Auth is configured only when both env vars are present — the gate
 *  degrades to a one-click "Continue" when the project isn't wired up. */
export const authConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase = authConfigured ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export type CvUser = Pick<User, 'id' | 'email'> & { name?: string };

function toCvUser(user: User | null): CvUser | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (typeof user.email === 'string' ? user.email.split('@')[0] : 'Driver');
  return { id: user.id, email: user.email, name };
}

/** Session hook — restores an existing Supabase session and live-updates on auth changes. */
export function useCvSession(): { user: CvUser | null; loading: boolean } {
  const [user, setUser] = useState<CvUser | null>(null);
  const [loading, setLoading] = useState(authConfigured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setUser(toCvUser(data.session?.user ?? null));
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      if (mounted) setUser(toCvUser(session?.user ?? null));
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

export async function cvSignUp(email: string, password: string, name?: string): Promise<string | null> {
  if (!supabase) return 'Auth is not configured on this deployment.';
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: name ? { data: { full_name: name } } : undefined,
  });
  if (error) return error.message;
  return null;
}

export async function cvSignIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'Auth is not configured on this deployment.';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return error.message;
  return null;
}

export async function cvSignInWithGoogle(): Promise<string | null> {
  if (!supabase) return 'Auth is not configured on this deployment.';
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) return error.message;
  return null; // browser redirects to Google; session resumes on return
}

export async function cvSignOut(): Promise<void> {
  await supabase?.auth.signOut();
}
