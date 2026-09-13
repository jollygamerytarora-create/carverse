'use client';

import { useEffect, useState, useRef } from 'react';
import { useStore } from '@/lib/store';

const NAV: { id: string; label: string; icon: string; action: 'reset' | 'mode' }[] = [
  { id: 'explore', label: 'Explore', icon: '◎', action: 'reset' },
  { id: 'discover', label: 'Discover', icon: '✦', action: 'mode' },
  { id: 'compare', label: 'Compare', icon: '⇄', action: 'mode' },
  { id: 'garage', label: 'My Garage', icon: '★', action: 'mode' },
  { id: 'history', label: 'History', icon: '⏳', action: 'mode' },
];

export default function Navigation() {
  const store = useStore();
  const [toast, setToast] = useState<string | null>(null);
  const logoClicks = useRef(0);
  const logoTimer = useRef(0);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  // easter egg: logo x5
  const onLogo = () => {
    logoClicks.current += 1;
    window.clearTimeout(logoTimer.current);
    logoTimer.current = window.setTimeout(() => (logoClicks.current = 0), 1600);
    if (logoClicks.current >= 5) {
      logoClicks.current = 0;
      store.selectVehicle('lambo-revuelto');
      showToast('🤫 Supercar mode — enjoy the Revuelto');
    } else if (logoClicks.current === 1) {
      store.reset();
    }
  };

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === '/') { e.preventDefault(); store.setMode('search'); }
      if (e.key === 'Escape') store.setMode(null);
      if (e.key.toLowerCase() === 'g') store.setMode(store.mode === 'garage' ? null : 'garage');
      if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey) store.setMode(store.mode === 'compare' ? null : 'compare');
      if (e.key.toLowerCase() === 'd') store.setMode(store.mode === 'discover' ? null : 'discover');
      if (e.key.toLowerCase() === 'i') store.setMode(store.mode === 'info' ? null : 'info');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store]);

  const handleNav = (item: (typeof NAV)[number]) => {
    if (item.action === 'reset') {
      store.reset();
      return;
    }
    if (store.mode === item.id) store.setMode(null);
    else store.setMode(item.id as never);
  };

  const activeId = store.mode ?? 'explore';

  return (
    <>
      <header className="topbar">
        <button className="brandlogo wordmark-nav" onClick={onLogo} aria-label="CARVERSE home — tap 5 times for a surprise">
          <span className="glyph font-display">
            CAR<b>VERSE</b>
          </span>
        </button>
        <div className="topbar-actions">
          <button
            className={`iconbtn ${store.soundOn ? 'active' : ''}`}
            onClick={() => store.setSoundOn(!store.soundOn)}
            aria-label={store.soundOn ? 'Mute interface sounds' : 'Enable interface sounds'}
            title="Sound"
          >
            {store.soundOn ? '🔊' : '🔇'}
          </button>
          <button className={`iconbtn ${store.mode === 'search' ? 'active' : ''}`} onClick={() => store.setMode('search')} aria-label="Search (shortcut: /)" title="Search (/)">
            🔍
          </button>
          <button className="iconbtn" onClick={() => store.setCreditsOpen(!store.creditsOpen)} aria-label="3D asset credits and licenses" title="Asset credits">
            ⚖
          </button>
          <button
            className={`iconbtn ${store.aiOpen ? 'active' : ''}`}
            onClick={() => store.setAiOpen(!store.aiOpen)}
            aria-label="CARVERSE AI assistant"
            title="CARVERSE AI"
          >
            ✦
          </button>
          <button
            className={`iconbtn ${store.mode === 'requests' ? 'active' : ''}`}
            onClick={() => store.setMode('requests')}
            aria-label="Request a feature"
            title="Request a Feature"
          >
            🛠
          </button>
        </div>
      </header>

      <nav className="navrail" aria-label="Main navigation">
        {NAV.map((item) => (
          <button key={item.id} className={`navbtn ${activeId === item.id ? 'active' : ''}`} onClick={() => handleNav(item)} aria-label={item.label}>
            <span className="ico" aria-hidden="true">{item.icon}</span>
            <span className="lbl">{item.label}</span>
          </button>
        ))}
      </nav>

      <nav className="mobilenav" aria-label="Mobile navigation">
        {NAV.map((item) => (
          <button key={item.id} className={activeId === item.id ? 'active' : ''} onClick={() => handleNav(item)}>
            <span className="ico" aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
