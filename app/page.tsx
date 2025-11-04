// app/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

const LOGO_URL =
  'https://cfremxfgqehqnbqummti.supabase.co/storage/v1/object/public/images/LOGO%20CONFIANCE.png';

export default function SplashPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [step, setStep] = useState<'animating' | 'leaving'>('animating');

  useEffect(() => {
    let alive = true;

    // 1) exibe logo por 1.8s antes de desaparecer
    const t1 = setTimeout(() => {
      if (!alive) return;
      setStep('leaving');
    }, 1800);

    // 2) navega depois da animação (~2.5 s total)
    const go = async () => {
      try {
        const { data } = await supa.auth.getSession();
        const hasSession = !!data.session;
        setTimeout(() => {
          const next = hasSession ? '/menu' : '/login';
          window.location.replace(next);
        }, 700);
      } catch {
        window.location.replace('/login');
      }
    };

    const t2 = setTimeout(go, 2500);

    return () => {
      alive = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [supa]);

  return (
    <div className={`splash ${step === 'leaving' ? 'splash-leave' : ''}`}>
      <img className="splashLogo" src={LOGO_URL} alt="CONFIANCE" />
    </div>
  );
}