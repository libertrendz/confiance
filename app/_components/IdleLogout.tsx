// app/_components/IdleLogout.tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import getBrowserSupabase from '@/lib/supa';

type Props = {
  timeoutMs?: number; // default: 10 min
};

export default function IdleLogout({ timeoutMs = 10 * 60 * 1000 }: Props) {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const timerRef = useRef<number | null>(null);

  function clearTimer() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer() {
    clearTimer();
    timerRef.current = window.setTimeout(async () => {
      try {
        await supa.auth.signOut();
      } catch {
        // ignora
      } finally {
        window.location.replace('/login');
      }
    }, timeoutMs);
  }

  useEffect(() => {
    // inicia quando o componente monta
    startTimer();

    const onActivity = () => startTimer();

    // desktop + mobile
    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'touchmove',
    ];

    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity as any));
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
