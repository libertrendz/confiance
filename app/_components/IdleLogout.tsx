// app/_components/IdleLogout.tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import getBrowserSupabase from '@/lib/supa';

type Props = {
  minutes?: number;     // compat
  timeoutMs?: number;   // opcional
  graceMs?: number;     // tolerância (ex.: relógio/visibilidade)
};

export default function IdleLogout({ minutes = 10, timeoutMs, graceMs = 15_000 }: Props) {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const lastRef = useRef<number>(Date.now());
  const intervalRef = useRef<number | null>(null);

  const effectiveTimeoutMs =
    typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : minutes * 60 * 1000;

  function touch() {
    lastRef.current = Date.now();
  }

  async function doLogout() {
    try {
      await supa.auth.signOut();
    } catch {
      // ignora
    } finally {
      window.location.replace('/login');
    }
  }

  function start() {
    // marca início como “ativo”
    touch();

    // limpa interval antigo
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // verifica a cada 5s (leve e confiável)
    intervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const idleFor = now - lastRef.current;

      if (idleFor > effectiveTimeoutMs + graceMs) {
        doLogout();
      }
    }, 5000);
  }

  useEffect(() => {
    start();

    const onActivity = () => touch();

    // (desktop + mobile)
    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'touchmove',
      'click',
    ];

    const opts: AddEventListenerOptions = { passive: true };

    events.forEach((ev) => window.addEventListener(ev, onActivity, opts));

    const onVisibility = () => {
      // quando volta pro app, considera atividade e reavalia
      touch();
    };

    window.addEventListener('focus', onVisibility);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity, opts as any));
      window.removeEventListener('focus', onVisibility);
      document.removeEventListener('visibilitychange', onVisibility);

      if (intervalRef.current != null) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTimeoutMs, graceMs]);

  return null;
}
