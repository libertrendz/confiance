'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supa } from '../../lib/supa';

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/menu';

  useEffect(() => {
    (async () => {
      try {
        // Troca o código do magic link por sessão e salva no storage
        await supa.auth.exchangeCodeForSession(window.location.href).catch(() => {});
        router.replace(next);
      } catch {
        router.replace('/login');
      }
    })();
  }, [router, next]);

  return <div style={{ padding: 24, fontFamily: 'system-ui' }}>Confirmando login…</div>;
}
