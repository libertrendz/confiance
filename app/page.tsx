// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '../lib/supa';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const supa = getBrowserSupabase();
      const { data } = await supa.auth.getUser();
      if (data.user) router.replace('/menu');
      else router.replace('/login');
    })();
  }, [router]);

  return <div style={{ padding: 24 }}>A carregar…</div>;
}
