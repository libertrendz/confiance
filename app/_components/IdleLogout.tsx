// app/_components/IdleLogout.tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import getBrowserSupabase from '@/lib/supa';

type Props = {
  minutes?: number;     // compat: usado no layout atual
  timeoutMs?: number;   // opcional: alternativa em ms
};

export default function IdleLogout({ minutes = 10, timeoutMs }: Props) {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const timerRef = useRef<number | null>(null);

  const effectiveTimeoutMs =
    typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : minutes * 60 * 1000;

  function clearTimer() {
    if (timerRef.current !== null) {
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
    }, effectiveTimeoutMs);
  }

  useEffect(() => {
    startTimer();

    const onActivity = () => startTimer();

    const windowEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'touchmove',
      'pointerdown',
      'pointermove',
    ];

    // visibilitychange é do document (não do window)
    const onVisibilityChange = () => {
      // ao voltar para a aba, renova timer
      if (!document.hidden) startTimer();
    };

    windowEvents.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      windowEvents.forEach((ev) => window.removeEventListener(ev, onActivity as any));
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTimeoutMs]);

  return null;
}
