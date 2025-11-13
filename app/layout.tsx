// app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'CONFIANCE',
  description: 'CONFIANCE - Gestão de obras, fornecedores e equipa',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <body>
        {children}
      </body>
    </html>
  );
}
