'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getCloudUser } from '@/lib/store';
import { authConfigured } from '@/lib/auth';
import { fetchFeatureRequests, createFeatureRequest, deleteFeatureRequest, type FeatureRequest } from '@/lib/cloud';

/**
 * "Request a Feature" — one universal wall. Every signed-in user's requests
 * are visible to everyone (shared table, read-for-all RLS). Guests are told
 * to sign in before posting.
 */

export default function FeatureRequests({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<FeatureRequest[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = getCloudUser();

  useEffect(() => {
    fetchFeatureRequests().then(setItems);
  }, []);

  async function post() {
    if (!user) {
      setError('Sign in to post a feature request.');
      return;
    }
    setBusy(true);
    setError(null);
    const err = await createFeatureRequest(user, text);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setText('');
    setItems(await fetchFeatureRequests());
  }

  async function remove(id: string) {
    if (!user) return;
    await deleteFeatureRequest(user, id);
    setItems(await fetchFeatureRequests());
  }

  const input = {
    flex: 1,
    padding: '11px 13px',
    borderRadius: 10,
    border: '1px solid rgba(216,181,106,0.25)',
    background: 'rgba(255,255,255,0.05)',
    color: '#f2f4f8',
    fontSize: 13.5,
    outline: 'none',
  } as const;

  return (
    <div className="garage-wrap" role="dialog" aria-label="Request a feature">
      <h2>Request a Feature</h2>
      <span className="k">Community ideas wall — visible to every driver</span>
      <button className="iconbtn" style={{ position: 'fixed', top: 22, right: 22 }} onClick={onClose} aria-label="Close feature requests">✕</button>

      <div style={{ display: 'flex', gap: 10, marginTop: 18, maxWidth: 720 }}>
        <input
          style={input}
          placeholder={user ? 'Describe the feature you dream of…' : 'Sign in to share your idea…'}
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !busy && void post()}
        />
        <button
          onClick={() => void post()}
          disabled={busy || !authConfigured}
          style={{
            padding: '11px 22px',
            borderRadius: 10,
            border: 'none',
            cursor: busy ? 'wait' : 'pointer',
            fontWeight: 700,
            fontSize: 13.5,
            color: '#0b0d13',
            background: 'linear-gradient(135deg, #d8b56a, #f0d9a0)',
            opacity: busy || !authConfigured ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {busy ? 'Posting…' : 'Post request'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 12, maxWidth: 720, padding: '10px 12px', borderRadius: 8, background: 'rgba(220,60,60,0.12)', border: '1px solid rgba(220,60,60,0.35)', color: '#ff9c9c', fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="garage-empty" style={{ marginTop: 26 }}>
          No requests yet — be the first to shape CARVERSE's future
        </div>
      ) : (
        <div style={{ marginTop: 24, display: 'grid', gap: 12, maxWidth: 720, width: '100%' }}>
          {items.map((r) => (
            <div
              key={r.id}
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                border: '1px solid rgba(216,181,106,0.18)',
                background: 'rgba(255,255,255,0.035)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <strong style={{ color: '#d8b56a', fontSize: 13.5 }}>{r.authorName}</strong>
                <span style={{ color: 'rgba(242,244,248,0.4)', fontSize: 11.5 }}>
                  {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                {user?.id === r.userId && (
                  <button
                    onClick={() => void remove(r.id)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,120,120,0.7)', cursor: 'pointer', fontSize: 12 }}
                  >
                    Delete
                  </button>
                )}
              </div>
              <div style={{ marginTop: 6, color: 'rgba(242,244,248,0.88)', fontSize: 14, lineHeight: 1.5 }}>{r.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
