// app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
import SwRegister from './_components/SwRegister';
import IdleLogout from './_components/IdleLogout';

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
    apple: [{ url: '/icons/icon-192.png' }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <SwRegister />
        <IdleLogout minutes={10} />
        {children}
      </body>
    </html>
  );
}
