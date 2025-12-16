///app/_components/IdleLogout.tsx
in
main
'use client';

import { useEffect, useMemo, useRef } from 'react';
import getBrowserSupabase from '@/lib/supa';

type Props = {
  minutes?: number; // default 10
};

export default function IdleLogout({ minutes = 10 }: Props) {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    const idleMs = Math.max(1, minutes) * 60 * 1000;

    const clearTimer = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const schedule = () => {
      clearTimer();
      timerRef.current = window.setTimeout(async () => {
        try {
          await supa.auth.signOut();
        } catch {}
        try {
          // remove só chaves do supabase (não limpa tudo do cliente)
          const keys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k) keys.push(k);
          }
          keys
            .filter((k) => k.startsWith('sb-') || k.includes('supabase'))
            .forEach((k) => localStorage.removeItem(k));
        } catch {}
        window.location.replace('/login?err=Sess%C3%A3o%20expirada%20por%20inatividade');
      }, idleMs);
    };

    const bump = () => schedule();

    // inicia
    schedule();

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];

    events.forEach((ev) => window.addEventListener(ev, bump, { passive: true }));

    return () => {
      clearTimer();
      events.forEach((ev) => window.removeEventListener(ev, bump as any));
    };
  }, [minutes, supa]);

  return null;
}
