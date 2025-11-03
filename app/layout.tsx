// app/layout.tsx
import './globals.css';
import SwRegister from './sw-register';

export const metadata = {
  title: 'CONFIANCE',
  description: 'Sistema CONFIANCE',
  manifest: '/manifest.webmanifest',
  themeColor: '#0A3D91',
  icons: {
    icon: ['/icon-192.png', '/icon-512.png', '/favicon.ico'],
    apple: ['/apple-touch-icon.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <meta name="application-name" content="CONFIANCE" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CONFIANCE" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0A3D91" />
      </head>
      <body>
        <SwRegister />
        {children}
      </body>
    </html>
  );
}