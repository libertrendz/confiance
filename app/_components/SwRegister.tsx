'use client';

import { useEffect } from 'react';

export default function SwRegister() {
  useEffect(() => {
    // só em produção (evita ruído no dev)
    if (process.env.NODE_ENV !== 'production') return;

    if (!('serviceWorker' in navigator)) return;

    const onLoad = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // tenta atualizar SW em background (não quebra nada)
        reg.update().catch(() => {});

        // opcional: log leve (pode remover se quiser)
        // console.log('[PWA] SW registered:', reg.scope);
      } catch (e) {
        // se falhar, o resto do app continua normal
        // console.warn('[PWA] SW register failed:', e);
      }
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
