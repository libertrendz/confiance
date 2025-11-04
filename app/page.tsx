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

    // 1) animação ~1.1s
    const t1 = setTimeout(() => {
      if (!alive) return;
      setStep('leaving');
    }, 1100);

    // 2) depois navega conforme sessão
    const go = async () => {
      try {
        const { data } = await supa.auth.getSession();
        const hasSession = !!data.session;
        // espera +400ms para finalizar animação de saída
        setTimeout(() => {
          const next = hasSession ? '/menu' : '/login';
          window.location.replace(next);
        }, 400);
      } catch {
        window.location.replace('/login');
      }
    };

    const t2 = setTimeout(go, 1150);

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