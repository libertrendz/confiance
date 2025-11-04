// app/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

// Usa o ficheiro local do logo (coloca /public/logo-confiance.png no repo)
const LOGO_SRC = '/logo-confiance.png';

export default function SplashPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [step, setStep] = useState<'animating' | 'leaving'>('animating');

  useEffect(() => {
    let alive = true;

    // 1) mostra o logo 1.8s e inicia o fade-out
    const t1 = setTimeout(() => {
      if (!alive) return;
      setStep('leaving');
    }, 1800);

    // 2) navega 600ms depois do início do fade (≈ 2.4s total)
    const go = async () => {
      try {
        const { data } = await supa.auth.getSession();
        const hasSession = !!data.session;
        setTimeout(() => {
          const next = hasSession ? '/menu' : '/login';
          window.location.replace(next);
        }, 600);
      } catch {
        window.location.replace('/login');
      }
    };

    const t2 = setTimeout(go, 1800); // chama go junto do fade-out

    return () => {
      alive = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [supa]);

  return (
    <div className={`splash ${step === 'leaving' ? 'splash-leave' : ''}`}>
      <img className="splashLogo" src={LOGO_SRC} alt="CONFIANCE" />
    </div>
  );
}
