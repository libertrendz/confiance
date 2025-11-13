// app/adm/layout.tsx
import '../globals.css';
import Topbar from '@/components/Topbar';

export const metadata = {
  title: 'CONFIANCE — Admin',
  description: 'Backoffice administrativo',
};

export default function AdmLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <Topbar />
        <main style={{ padding: 'var(--space-3)' }}>{children}</main>
        <footer
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--muted)',
            padding: '12px 0',
          }}
        >
          Powered by <strong>LIBERTRENDZ®</strong>
        </footer>
      </body>
    </html>
  );
}
