'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Vehicle } from '@/lib/types';
import { engineSynth } from '@/lib/engineAudio';
import { DEMO_NOTE } from '@/data';

const BARS = 32;

export default function SoundExperience({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const [running, setRunning] = useState(false);
  const [rpm, setRpm] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const raf = useRef(0);
  const holding = useRef(false);
  const barRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    engineSynth.stop();
    setRunning(false);
    setRpm(0);
  }, [vehicle.id]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(raf.current);
      engineSynth.stop();
    };
  }, []);

  const loop = useCallback(() => {
    raf.current = requestAnimationFrame(loop);
    const norm = engineSynth.rpm;
    setRpm(norm);
    barRefs.current.forEach((el, i) => {
      if (!el) return;
      const th = (i / BARS) * 0.75 + 0.05;
      const on = norm > th * 0.9;
      el.style.height = `${18 + norm * 70 * (0.4 + Math.random() * 0.6)}%`;
      el.className = on ? (th > 0.62 ? 'red' : 'on') : '';
    });
  }, []);

  useEffect(() => {
    if (running) loop();
    return () => cancelAnimationFrame(raf.current);
  }, [running, loop]);

  const start = () => {
    engineSynth.blip();
    window.setTimeout(() => {
      engineSynth.start(vehicle.sound, volume);
      engineSynth.setRpm(0.16);
      setRunning(true);
    }, 420);
  };

  const stop = () => {
    engineSynth.stop();
    setRunning(false);
    setRpm(0);
  };

  const setRpmVal = (n: number) => {
    engineSynth.setRpm(n);
    setRpm(n);
  };

  // throttle hold
  const holdStart = () => {
    if (!running) return;
    holding.current = true;
    engineSynth.setRpm(0.95);
    setRpm(0.95);
  };
  const holdEnd = () => {
    holding.current = false;
    if (running) setRpmVal(0.16);
  };

  const changeVolume = (v: number) => {
    setVolume(v);
    engineSynth.setVolume(v);
  };

  const pct = Math.round(rpm * 100);

  return (
    <div className="soundexp" role="dialog" aria-label="Engine sound experience">
      <button className="iconbtn" style={{ position: 'absolute', top: 22, right: 22 }} onClick={onClose} aria-label="Close sound experience">✕</button>

      <span className="k">Sound experience — demo synthesis</span>
      <h2>{vehicle.model}</h2>
      <div className="eng">{vehicle.engine}</div>

      <div className="rpm" aria-hidden="true">
        {Array.from({ length: BARS }).map((_, i) => (
          <i key={i} ref={(el) => { barRefs.current[i] = el; }} />
        ))}
      </div>

      <div className="k" style={{ marginTop: 14 }}>{pct}% RPM · {vehicle.sound.electric ? 'E-MOTOR' : `${vehicle.sound.base} HZ BASE · ${vehicle.sound.cylinders} CYL`}</div>

      <div className="soundctl">
        {!running ? (
          <button className="bigbtn primary" onClick={start}>▶ Start engine</button>
        ) : (
          <>
            <button
              className="bigbtn rev"
              onPointerDown={holdStart}
              onPointerUp={holdEnd}
              onPointerLeave={holdEnd}
              aria-label="Hold to rev engine"
            >
              Hold to rev
            </button>
            <button className="bigbtn" onClick={() => setRpmVal(0.16)}>Idle</button>
            <button className="bigbtn" onClick={stop}>Stop</button>
          </>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="k">
          Vol
          <input className="range" type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => changeVolume(parseFloat(e.target.value))} aria-label="Volume" />
        </label>
      </div>

      <div className="demo-note">{DEMO_NOTE}</div>
    </div>
  );
}
