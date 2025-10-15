// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Confiance',
  description: 'Gestão de obras',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
