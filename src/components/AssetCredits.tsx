'use client';

/**
 * §29 — ASSET CREDIT SYSTEM. Public, honest provenance for every 3D asset
 * the site renders. Data comes solely from assetRegistry.ts.
 */

import { ASSET_RECORDS } from '@/lib/assetRegistry';
import { GENERATED_RECORDS } from '@/lib/generatedAssetRecords';
import { useStore } from '@/lib/store';
import { vehicleById } from '@/data';

export default function AssetCredits() {
  const open = useStore((s) => s.creditsOpen);
  const setOpen = useStore((s) => s.setCreditsOpen);

  if (!open) return null;
  const records = [...Object.entries(ASSET_RECORDS), ...Object.entries(GENERATED_RECORDS)];

  return (
    <div className="credits-veil" role="dialog" aria-modal="true" aria-label="3D asset credits and licenses" onClick={() => setOpen(false)}>
      <div className="credits-panel" onClick={(e) => e.stopPropagation()}>
        <div className="credits-head">
          <div>
            <div className="credits-kicker">ASSET CREDITS &amp; LICENSING</div>
            <h3 className="credits-title">3D Model Provenance</h3>
          </div>
          <button className="iconbtn" onClick={() => setOpen(false)} aria-label="Close credits">✕</button>
        </div>

        <p className="credits-policy">
          CARVERSE renders only assets it has the rights to use. Unlicensed placeholder shapes are never substituted
          for missing models — cars without an approved asset show an explicit “model unavailable” state. Each record
          below lists the creator, license and source of every third-party asset on the site.
        </p>

        {records.length === 0 && <p className="credits-empty">No 3D assets registered yet.</p>}

        <div className="credits-list">
          {records.map(([id, a]) => {
            const v = vehicleById(id);
            return (
              <article key={id} className="credit-row">
                <header className="credit-top">
                  <span className="credit-car">{v ? `${v.brand.toUpperCase()} ${v.model}` : id}</span>
                  <span className={`credit-badge ${a.qcNote ? 'pending' : 'ready'}`}>{a.qcNote ? 'STAGE PLACEHOLDER' : '3D READY'}</span>
                </header>
                {v && <div className="credit-sub">{v.generation} · {v.year}</div>}
                <dl className="credit-meta">
                  <div><dt>File</dt><dd className="credit-file">{a.model3D}</dd></div>
                  <div><dt>Creator</dt><dd>{a.license.creator}</dd></div>
                  <div><dt>License</dt><dd>{a.license.type}{a.license.licenseURL && <> · <a href={a.license.licenseURL} target="_blank" rel="noreferrer">terms</a></>}</dd></div>
                  <div><dt>Source</dt><dd><a href={a.license.source} target="_blank" rel="noreferrer">{a.license.source}</a></dd></div>
                  <div><dt>Attribution</dt><dd>{a.license.attribution}</dd></div>
                  <div><dt>Redistribution</dt><dd>{a.license.redistributable ? 'Permitted — asset may ship in /public' : 'Not permitted — streamed from origin'}</dd></div>
                  {a.qcNote && <div><dt>QC note</dt><dd>{a.qcNote}</dd></div>}
                </dl>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
