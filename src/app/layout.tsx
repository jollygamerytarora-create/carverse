import type { Metadata, Viewport } from 'next';
import { Michroma, Manrope } from 'next/font/google';
import './globals.css';

const michroma = Michroma({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CARVERSE — The 3D Interactive Automotive Encyclopedia',
  description:
    'Explore manufacturers and cars in an interactive 3D showroom: specs, engine sounds, interiors, analytics, comparisons and automotive history.',
};

export const viewport: Viewport = {
  themeColor: '#07080b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${michroma.variable} ${manrope.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
