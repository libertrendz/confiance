// app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
import Script from 'next/script';

export const metadata = {
  applicationName: 'CONFIANCE',
  title: 'CONFIANCE',
  manifest: '/manifest.webmanifest',
  themeColor: '#0e3258',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CONFIANCE',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <body>
        {/* Registo do Service Worker (PWA) */}
        <Script id="sw-register" strategy="afterInteractive">
          {`
            (function () {
              if (!('serviceWorker' in navigator)) return;
              window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
              });
            })();
          `}
        </Script>

        {children}
      </body>
    </html>
  );
}
