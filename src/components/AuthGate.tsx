'use client';

import { useState, type FormEvent } from 'react';
import { authConfigured, cvSignIn, cvSignUp, cvSignInWithGoogle } from '@/lib/auth';

/**
 * CARVERSE AuthGate — the first-run welcome screen. Blocks the showroom until
 * the visitor signs up / signs in (Supabase) or chooses to continue as a guest.
 * Styled to match the app's dark chrome-and-gold identity.
 */

const ACCENT = '#d8b56a';

export default function AuthGate({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const err = mode === 'signup' ? await cvSignUp(email.trim(), password, name.trim() || undefined) : await cvSignIn(email.trim(), password);
    setBusy(false);
    if (err) setError(err);
    // success path: the onAuthStateChange listener flips the session and the
    // gate unmounts itself via the parent's user check.
  }

  const input = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid rgba(216,181,106,0.25)',
    background: 'rgba(255,255,255,0.04)',
    color: '#f2f4f8',
    fontSize: 14,
    outline: 'none',
  } as const;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(1200px 600px at 70% 20%, rgba(216,181,106,0.12), transparent 60%), linear-gradient(180deg, #07080c 0%, #0b0d13 60%, #060709 100%)',
      }}
    >
      <div
        style={{
          width: 'min(400px, calc(100vw - 40px))',
          padding: '36px 32px 28px',
          borderRadius: 20,
          border: '1px solid rgba(216,181,106,0.22)',
          background: 'rgba(10,12,18,0.86)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '0.34em', color: '#f2f4f8' }}>
            CAR<span style={{ color: ACCENT }}>VERSE</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 12.5, letterSpacing: '0.18em', color: 'rgba(242,244,248,0.55)', textTransform: 'uppercase' }}>
            The 3D Automotive Encyclopedia
          </div>
        </div>

        {authConfigured ? (
          <form onSubmit={submit}>
            {mode === 'signup' && (
              <input
                style={{ ...input, marginBottom: 12 }}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            )}
            <input
              style={{ ...input, marginBottom: 12 }}
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              style={{ ...input, marginBottom: 16 }}
              type="password"
              required
              minLength={6}
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />

            {error && (
              <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, background: 'rgba(220,60,60,0.12)', border: '1px solid rgba(220,60,60,0.35)', color: '#ff9c9c', fontSize: 12.5 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{
                width: '100%',
                padding: '13px 0',
                borderRadius: 10,
                border: 'none',
                cursor: busy ? 'wait' : 'pointer',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#0b0d13',
                background: `linear-gradient(135deg, ${ACCENT}, #f0d9a0)`,
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(216,181,106,0.18)' }} />
              <span style={{ fontSize: 11, letterSpacing: '0.12em', color: 'rgba(242,244,248,0.4)' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(216,181,106,0.18)' }} />
            </div>

            <button
              type="button"
              onClick={async () => {
                setError(null);
                const err = await cvSignInWithGoogle();
                if (err) setError(err);
              }}
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 10,
                border: '1px solid rgba(242,244,248,0.22)',
                background: '#ffffff',
                color: '#1f1f1f',
                cursor: 'pointer',
                fontSize: 13.5,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
              </svg>
              Continue with Google
            </button>

            <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12.5, color: 'rgba(242,244,248,0.55)' }}>
              {mode === 'signup' ? 'Already have an account? ' : 'New to CARVERSE? '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signup' ? 'signin' : 'signup');
                  setError(null);
                }}
                style={{ background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}
              >
                {mode === 'signup' ? 'Sign in' : 'Create one'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ marginBottom: 16, fontSize: 13, color: 'rgba(242,244,248,0.6)', textAlign: 'center' }}>
            Accounts are not configured on this deployment — you can explore as a guest.
          </div>
        )}

        <button
          type="button"
          onClick={onDone}
          style={{
            width: '100%',
            marginTop: 10,
            padding: '11px 0',
            borderRadius: 10,
            background: 'none',
            border: '1px solid rgba(242,244,248,0.16)',
            color: 'rgba(242,244,248,0.72)',
            cursor: 'pointer',
            fontSize: 13,
            letterSpacing: '0.06em',
          }}
        >
          Continue as guest
        </button>
      </div>
    </div>
  );
}
