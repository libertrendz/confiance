// app/_components/IdleLogout.tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import getBrowserSupabase from '@/lib/supa';

type Props = {
  minutes?: number;     // compat
  timeoutMs?: number;   // opcional
};

export default function IdleLogout({ minutes = 30, timeoutMs }: Props) {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<number | null>(null);
  const signingOutRef = useRef(false);

  const effectiveTimeoutMs =
    typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : minutes * 60 * 1000;

  function markActivity() {
    lastActivityRef.current = Date.now();
  }

  async function doLogout() {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    try {
      await supa.auth.signOut();
    } catch {
      // ignora
    } finally {
      window.location.replace('/login');
    }
  }

  useEffect(() => {
    markActivity();

    const onActivity = () => markActivity();
    const onVisibility = () => {
      if (!document.hidden) markActivity();
    };

    const winEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'touchmove',
      'touchend',
      'pointerdown',
      'pointermove',
      'pointerup',
      'wheel',
      'click',
      'focus',
    ];

    winEvents.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);

    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= effectiveTimeoutMs) {
        doLogout();
      }
    }, 5000);

    return () => {
      winEvents.forEach((ev) => window.removeEventListener(ev, onActivity as any));
      document.removeEventListener('visibilitychange', onVisibility as any);

      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTimeoutMs]);

  return null;
}
