'use client';

import { useEffect, useState } from 'react';
import { useStore, currentVehicle } from '@/lib/store';
import World from './World';
import Navigation from './Navigation';
import Boot, { PreloadChip } from './Boot';
import InfoSheet from './modes/InfoSheet';
import FunFactOverlay from './modes/FunFactOverlay';
import SoundExperience from './modes/SoundExperience';
import AnalyticsPanel from './modes/AnalyticsPanel';
import Compare from './modes/Compare';
import SearchOverlay from './modes/SearchOverlay';
import { DiscoverGrid, CategoryResults } from './modes/Discover';
import Garage from './modes/Garage';
import FeatureRequests from './modes/FeatureRequests';
import HistoryOverlay from './modes/HistoryOverlay';
import Configurator from './modes/Configurator';
import AiAssistant from './modes/AiAssistant';
import AssetCredits from './AssetCredits';
import AuthGate from './AuthGate';
import { engineSynth } from '@/lib/engineAudio';
import { createKonamiListener } from '@/lib/utils';
import { prefersReducedMotion } from '@/lib/utils';
import { useCvSession, cvSignOut, type CvUser } from '@/lib/auth';
import { setCloudUser } from '@/lib/store';
import { fetchFavorites } from '@/lib/cloud';

export default function CarverseApp() {
  const store = useStore();
  const vehicle = currentVehicle();
  const { user, loading } = useCvSession();
  // When a user signs in, load THEIR private garage from Supabase and make the
  // store mirror favorite toggles to the cloud for that user.
  useEffect(() => {
    setCloudUser(user);
    if (user) {
      fetchFavorites(user.id).then((ids) => {
        if (ids.length) useStore.setState({ garage: ids });
      });
    }
  }, [user]);
  // First-run gate: show the welcome screen until the visitor signs in OR
  // explicitly continues as a guest (tracked locally so guests aren't nagged
  // on every reload).
  const [guestOk, setGuestOk] = useState(false);
  useEffect(() => {
    try {
      setGuestOk(window.localStorage.getItem('cv_guest_ok') === '1');
    } catch {
      /* private mode — gate simply re-shows */
    }
  }, []);
  const admitGuest = () => {
    try {
      window.localStorage.setItem('cv_guest_ok', '1');
    } catch {
      /* noop */
    }
    setGuestOk(true);
  };
  const authed: CvUser | null = user;
  const gateDone = authed || guestOk;

  // stop engine audio when leaving sound mode
  useEffect(() => {
    if (store.mode !== 'sound') engineSynth.stop();
  }, [store.mode]);

  // konami easter egg → secret garage
  useEffect(() => {
    return createKonamiListener(() => {
      store.selectVehicle('ferrari-sf90');
      store.setAiOpen(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#07080c', color: 'rgba(242,244,248,0.6)', fontSize: 13, letterSpacing: '0.14em' }}>
        STARTING ENGINE…
      </div>
    );
  }

  if (!gateDone) return <AuthGate onDone={admitGuest} />;

  return (
    <>
      {/* account chip — bottom-left, only while freely exploring (no overlay open) */}
      {store.mode === null && gateDone && (
        <div
          title={authed ? `Signed in as ${authed.email ?? authed.name}` : 'Browsing as a guest'}
          style={{
            position: 'fixed',
            bottom: 18,
            left: 18,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(10,12,18,0.72)',
            border: '1px solid rgba(216,181,106,0.28)',
            borderRadius: 999,
            padding: '5px 6px 5px 14px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'rgba(242,244,248,0.85)',
              letterSpacing: '0.04em',
              maxWidth: 140,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {authed ? authed.name || authed.email : 'Guest'}
          </span>
          <button
            onClick={async () => {
              await cvSignOut();
              // log out → back to the welcome gate, not silent guest mode
              try {
                window.localStorage.removeItem('cv_guest_ok');
              } catch {
                /* noop */
              }
              setGuestOk(false);
            }}
            title="Log out"
            style={{
              background: 'linear-gradient(135deg, #d8b56a, #f0d9a0)',
              border: 'none',
              color: '#0b0d13',
              borderRadius: 999,
              padding: '5px 12px',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      )}
      <World />
      <Navigation />

      {store.mode === 'info' && (
        <div className="sheet-outer" onClick={(e) => e.target === e.currentTarget && store.setMode(null)}>
          <InfoSheet vehicle={vehicle} />
        </div>
      )}
      {store.mode === 'funfact' && <FunFactOverlay vehicle={vehicle} onClose={() => store.setMode(null)} />}
      {store.mode === 'sound' && <SoundExperience vehicle={vehicle} onClose={() => store.setMode(null)} />}
      {store.mode === 'analytics' && <AnalyticsPanel vehicle={vehicle} onClose={() => store.setMode(null)} />}
      {store.mode === 'compare' && <Compare />}
      {store.mode === 'search' && <SearchOverlay />}
      {store.mode === 'discover' && <DiscoverGrid />}
      {store.mode === 'catresults' && <CategoryResults />}
      {store.mode === 'garage' && <Garage />}
      {store.mode === 'requests' && <FeatureRequests onClose={() => store.setMode(null)} />}
      {store.mode === 'history' && <HistoryOverlay />}
      {store.mode === 'configure' && <Configurator vehicle={vehicle} onClose={() => store.setMode(null)} />}
      {store.mode === 'interior' && store.view === 'car' && (
        <button className="ghostbtn exit-interior" onClick={() => store.setMode(null)} aria-label="Exit interior">
          ← Exterior
        </button>
      )}

      {store.aiOpen && <AiAssistant />}
      <AssetCredits />
      <Boot />
      <PreloadChip />
    </>
  );
}
