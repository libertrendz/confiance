// app/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

// usa o mesmo ícone maskable do PWA para unificar visual
const LOGO_SRC = '/icon-512-maskable.png';

export default function SplashPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [step, setStep] = useState<'animating' | 'leaving'>('animating');

  useEffect(() => {
    let alive = true;

    const t1 = setTimeout(() => { if (alive) setStep('leaving'); }, 1800);

    const go = async () => {
      try {
        const { data } = await supa.auth.getSession();
        const hasSession = !!data.session;
        setTimeout(() => {
          window.location.replace(hasSession ? '/menu' : '/login');
        }, 600);
      } catch {
        window.location.replace('/login');
      }
    };
    const t2 = setTimeout(go, 1800);

    return () => { alive = false; clearTimeout(t1); clearTimeout(t2); };
  }, [supa]);

  return (
    <div className={`splash ${step === 'leaving' ? 'splash-leave' : ''}`}>
      <img className="splashLogo" src={LOGO_SRC} alt="CONFIANCE" />
    </div>
  );
}
