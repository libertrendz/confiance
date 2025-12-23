'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import getBrowserSupabase from '@/lib/supa';

type Props = {
  minutes?: number;     // default fallback
  timeoutMs?: number;   // opcional
};

export default function IdleLogout({ minutes = 45, timeoutMs }: Props) {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const pathname = usePathname();

  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<number | null>(null);
  const signingOutRef = useRef(false);

  // regra: ADM muito maior
  const defaultMs = (() => {
    if (pathname?.startsWith('/adm')) return 8 * 60 * 60 * 1000; // 8h
    return minutes * 60 * 1000; // 45 min default
  })();

  const effectiveTimeoutMs =
    typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : defaultMs;

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
    const onVisibility = () => { if (!document.hidden) markActivity(); };

    const winEvents: Array<keyof WindowEventMap> = [
      'mousemove','mousedown','keydown','scroll','touchstart','touchmove','touchend',
      'pointerdown','pointermove','pointerup','wheel','click','focus',
    ];

    winEvents.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility, { passive: true } as any);

    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= effectiveTimeoutMs) doLogout();
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
