'use client';

import { CSSProperties } from 'react';

/**
 * Minimal geometric brand marks, drawn as inline SVG so they render instantly,
 * scale losslessly, and can be tinted for cinematic scenes.
 * Trademarks belong to their respective manufacturers — used descriptively.
 */

export function BrandLogo({ id, className, style }: { id: string; className?: string; style?: CSSProperties }) {
  const common = {
    className: `brandlogo ${className ?? ''}`,
    style,
    viewBox: '0 0 100 100',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true as const,
  };

  switch (id) {
    case 'bmw':
      return (
        <svg {...common}>
          <circle cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="4" />
          <circle cx="50" cy="50" r="36" stroke="currentColor" strokeWidth="2" />
          <g>
            <path d="M50 14 A36 36 0 0 1 86 50 L50 50 Z" fill="currentColor" opacity="0.9" />
            <path d="M50 86 A36 36 0 0 1 14 50 L50 50 Z" fill="currentColor" opacity="0.9" />
            <path d="M14 50 A36 36 0 0 1 50 14 L50 50 Z" fill="currentColor" opacity="0.28" />
            <path d="M86 50 A36 36 0 0 1 50 86 L50 50 Z" fill="currentColor" opacity="0.28" />
          </g>
          <text x="50" y="12" textAnchor="middle" fontSize="9" fill="currentColor" fontWeight="700">BMW</text>
        </svg>
      );

    case 'mercedes':
      return (
        <svg {...common}>
          <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="4" />
          <path d="M50 50 L50 5 M50 50 L85.5 72.5 M50 50 L14.5 72.5" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
          <circle cx="50" cy="50" r="7" fill="currentColor" />
        </svg>
      );

    case 'porsche':
      return (
        <svg {...common}>
          <path d="M50 5 L92 15 C92 62 78 84 50 95 C22 84 8 62 8 15 Z" stroke="currentColor" strokeWidth="4" fill="currentColor" fillOpacity="0.08" />
          <path d="M50 16 L82 23.5 C82 56 71.5 74 50 84 C28.5 74 18 56 18 23.5 Z" stroke="currentColor" strokeWidth="2.4" />
          <g stroke="currentColor" strokeWidth="2.2">
            <line x1="24" y1="32" x2="76" y2="32" />
            <line x1="25.5" y1="40" x2="74.5" y2="40" />
            <line x1="28" y1="48" x2="72" y2="48" />
            <line x1="31" y1="56" x2="69" y2="56" />
            <line x1="36" y1="64" x2="64" y2="64" />
          </g>
          <text x="50" y="27" textAnchor="middle" fontSize="8.5" fill="currentColor" fontWeight="700" letterSpacing="1">PORSCHE</text>
        </svg>
      );

    case 'audi':
      return (
        <svg {...common} viewBox="0 0 140 100">
          {[31, 57, 83, 109].map((cx) => (
            <circle key={cx} cx={cx} cy="50" r="22" stroke="currentColor" strokeWidth="5" />
          ))}
        </svg>
      );

    case 'ferrari':
      return (
        <svg {...common}>
          <path d="M22 8 H78 V52 C78 74 68 88 50 94 C32 88 22 74 22 52 Z" stroke="currentColor" strokeWidth="4" fill="currentColor" fillOpacity="0.07" />
          <rect x="26.5" y="12" width="7" height="34" rx="1" fill="currentColor" opacity="0.85" />
          <rect x="35" y="12" width="6" height="34" rx="1" fill="currentColor" opacity="0.45" />
          <text x="61" y="24" textAnchor="middle" fontSize="13" fill="currentColor" fontWeight="700">SF</text>
          <path
            d="M48 30 C46 36 44 40 46 46 C47 50 45 54 43 58 C41 63 43 68 47 70 C50 71 53 69 54 66 C55 63 54 60 56 57 C58 54 60 51 59 46 C58 40 55 36 55 31 C55 27 53 24 51 24 C49 24 49 27 48 30 Z"
            fill="currentColor"
            opacity="0.95"
          />
          <path d="M54 28 L62 22 M55 34 L64 31" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );

    case 'lamborghini':
      return (
        <svg {...common}>
          <path d="M50 4 L90 14 V52 C90 76 76 90 50 96 C24 90 10 76 10 52 V14 Z" stroke="currentColor" strokeWidth="4" fill="currentColor" fillOpacity="0.07" />
          <path d="M50 12 L84 20.5 V52 C84 72.5 72 84.5 50 90 C28 84.5 16 72.5 16 52 V20.5 Z" stroke="currentColor" strokeWidth="1.8" opacity="0.7" />
          <path
            d="M30 58 C34 50 40 46 46 45 C52 44 56 41 60 36 C63 32 68 30 71 33 C73 35 72 39 70 41 C66 45 64 50 62 55 C60 61 54 64 48 64 C42 64 35 62 30 58 Z"
            fill="currentColor"
            opacity="0.95"
          />
          <path d="M36 40 L44 34 M62 30 L70 28" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'mclaren':
      return (
        <svg {...common} viewBox="0 0 140 100">
          <path
            d="M18 62 C30 34 62 20 96 26 C104 27.5 112 31 118 36 C108 34 96 35 84 40 C62 49 46 58 34 68 C29 72 22 69 18 62 Z"
            fill="currentColor"
          />
        </svg>
      );

    case 'toyota':
      return (
        <svg {...common}>
          <ellipse cx="50" cy="50" rx="45" ry="29" stroke="currentColor" strokeWidth="4.5" />
          <ellipse cx="50" cy="50" rx="19" ry="27" stroke="currentColor" strokeWidth="4.5" />
          <ellipse cx="50" cy="41" rx="30" ry="9" stroke="currentColor" strokeWidth="4" />
        </svg>
      );

    case 'nissan':
      return (
        <svg {...common}>
          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="4.5" />
          <rect x="8" y="42" width="84" height="16" fill="var(--cv-bg, #07080b)" />
          <rect x="10" y="44" width="80" height="12" stroke="currentColor" strokeWidth="2.4" fill="var(--cv-bg, #07080b)" />
          <text x="50" y="53.4" textAnchor="middle" fontSize="9" fill="currentColor" fontWeight="700" letterSpacing="2">NISSAN</text>
        </svg>
      );

    case 'tesla':
      return (
        <svg {...common}>
          <path d="M22 14 C40 8 60 8 78 14 L72 26 C58 21 42 21 28 26 Z" fill="currentColor" />
          <path d="M46 26 L54 26 L52 46 L58 84 C55.5 86 44.5 86 42 84 L48 46 Z" fill="currentColor" transform="translate(-6,0)" />
          <path d="M50 30 L50 84" stroke="currentColor" strokeWidth="0" />
          <path d="M30 34 C36 44 42 48 50 50 C58 48 64 44 70 34 L64 28 C58 36 54 39 50 40 C46 39 42 36 36 28 Z" fill="currentColor" opacity="0.85" />
        </svg>
      );

    case 'ford':
      return (
        <svg {...common} viewBox="0 0 140 100">
          <ellipse cx="70" cy="50" rx="62" ry="33" stroke="currentColor" strokeWidth="4.5" />
          <ellipse cx="70" cy="50" rx="55" ry="26" stroke="currentColor" strokeWidth="2" opacity="0.6" />
          <text x="70" y="61" textAnchor="middle" fontSize="30" fill="currentColor" fontStyle="italic" fontWeight="700" style={{ fontFamily: 'Georgia, serif' }}>
            Ford
          </text>
        </svg>
      );

    case 'maruti':
      // stylised winged M
      return (
        <svg {...common}>
          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="4" />
          <path
            d="M20 62 C28 46 40 36 50 36 C60 36 72 46 80 62 C72 54 62 50 50 50 C38 50 28 54 20 62 Z"
            fill="currentColor"
          />
          <path d="M30 66 C37 56 43 53 50 53 C57 53 63 56 70 66" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'tata':
      // stylised T in a shield
      return (
        <svg {...common}>
          <path d="M50 4 L90 16 V54 C90 76 74 90 50 96 C26 90 10 76 10 54 V16 Z" stroke="currentColor" strokeWidth="4" fill="currentColor" fillOpacity="0.06" />
          <path d="M26 30 H74" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
          <path d="M50 30 V74" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        </svg>
      );

    case 'mahindra':
      // stylised road-to-horizon M
      return (
        <svg {...common}>
          <path d="M14 74 L32 26 L50 58 L68 26 L86 74" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 82 H86" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
        </svg>
      );

    case 'rolls':
      // twin-R monogram over a winged base
      return (
        <svg {...common}>
          <rect x="8" y="30" width="84" height="44" rx="10" stroke="currentColor" strokeWidth="4" fill="currentColor" fillOpacity="0.05" />
          <text x="35" y="62" textAnchor="middle" fontSize="26" fill="currentColor" fontWeight="700" fontStyle="italic">R</text>
          <text x="65" y="62" textAnchor="middle" fontSize="26" fill="currentColor" fontWeight="700" fontStyle="italic">R</text>
          <line x1="50" y1="14" x2="50" y2="28" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M50 14 C40 10 28 10 20 16 C30 16 42 18 50 22 Z" fill="currentColor" />
          <path d="M50 14 C60 10 72 10 80 16 C70 16 58 18 50 22 Z" fill="currentColor" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="4" />
          <text x="50" y="58" textAnchor="middle" fontSize="26" fill="currentColor" fontWeight="700">?</text>
        </svg>
      );
  }
}

export default BrandLogo;
