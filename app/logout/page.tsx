///app/logout/page.tsx
'use client';

import { useEffect } from 'react';

export default function LogoutPage() {
  useEffect(() => {
    // /logout vira apenas um alias para o logout oficial
    window.location.replace('/auth/signout');
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>A terminar sessão…</h1>
    </main>
  );
}
