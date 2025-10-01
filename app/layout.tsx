import './globals.css';

export const metadata = {
  title: 'CONFIANCE',
  description: 'Ponto + Orçamentos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="min-h-screen bg-white text-gray-900">
        <main className="max-w-3xl mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
