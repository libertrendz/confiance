// app/layout.tsx
export const metadata = { title: 'Confiance' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body style={{ fontFamily: 'system-ui' }}>{children}</body>
    </html>
  );
}
