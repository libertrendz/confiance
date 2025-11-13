// app/layout.tsx
import './globals.css';

export const metadata = {
  title: 'CONFIANCE',
  description: 'ERP modular leve',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        {children}
        <footer style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--muted)',
          padding: '12px 0'
        }}>
          Powered by <strong>LIBERTRENDZ®</strong>
        </footer>
      </body>
    </html>
  );
}
