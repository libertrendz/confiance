'use client';

import { useEffect } from 'react';
import { supa } from '@/lib/supa';

export default function Callback() {
  useEffect(() => {
    (async () => {
      try {
        // troca o código do hash pela sessão persistida (localStorage)
        const { error } = await supa.auth.exchangeCodeForSession(window.location.hash);
        // se o login veio com ?next=/rota, respeita; senão vai pro /menu
        const next = new URLSearchParams(window.location.search).get('next') ?? '/menu';
        if (error) console.error(error);
        window.location.replace(next);
      } catch {
        window.location.replace('/login');
      }
    })();
  }, []);

  return <div style={{ padding: 24, fontFamily: 'system-ui' }}>Validando sessão…</div>;
}
