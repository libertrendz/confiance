// app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supa-browser';

export default function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/menu';

  useEffect(() => {
    (async () => {
      const supa = getBrowserSupabase();
      await supa.auth.getSessionFromUrl({ storeSession: true }).catch(() => {});
      router.replace(next);
    })();
  }, [router, next]);

  return <div style={{ padding: 24, fontFamily: 'system-ui' }}>Confirmando o login…</div>;
}
