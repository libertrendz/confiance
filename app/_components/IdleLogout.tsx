// app/_components/IdleLogout.tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import getBrowserSupabase from '@/lib/supa';

type Props = {
  minutes?: number; // compat: usado no layout atual
  timeoutMs?: number;
};

const LS_KEY = 'confiance:lastActivityAt';

export default function IdleLogout({ minutes = 10, timeoutMs }: Props) {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const pathname = usePathname();

  const intervalRef = useRef<number | null>(null);

  const effectiveTimeoutMs =
    typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : minutes * 60 * 1000;

  const shouldSkip =
    !pathname ||
    pathname === '/login' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api');

  function nowMs() {
    return Date.now();
  }

  function readLast(): number {
    const raw = localStorage.getItem(LS_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : 0;
  }

  function writeLast(ts: number) {
    try {
      localStorage.setItem(LS_KEY, String(ts));
    } catch {}
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

  function markActivity() {
    const ts = nowMs();
    writeLast(ts);
  }

  function clearIntervalTimer() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startLoop() {
    clearIntervalTimer();

    // garante base inicial (importante ao abrir 2 abas)
    if (!readLast()) writeLast(nowMs());

    intervalRef.current = window.setInterval(() => {
      const last = readLast();
      const idleFor = nowMs() - last;

      if (idleFor >= effectiveTimeoutMs) {
        clearIntervalTimer();
        void doLogout();
      }
    }, 5000);
  }

  useEffect(() => {
    if (shouldSkip) return;

    // marca atividade na entrada
    markActivity();
    startLoop();

    const onActivity = () => markActivity();

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'touchmove',
      'pointerdown',
      'pointermove',
      'visibilitychange',
    ];

    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    // sincroniza entre abas (quando outra aba marca atividade)
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        // nada a fazer aqui além de “acordar” o loop; ele já lê o LS_KEY
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity as any));
      window.removeEventListener('storage', onStorage);
      clearIntervalTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTimeoutMs, shouldSkip]);

  return null;
}
