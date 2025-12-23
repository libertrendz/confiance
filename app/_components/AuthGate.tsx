// app/_components/AuthGate.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import getBrowserSupabase from '@/lib/supa';

const PUBLIC_PREFIXES = ['/login', '/auth/confirm', '/logout', '/auth/signout'];

export default function AuthGate() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;

    const isPublic = PUBLIC_PREFIXES.some((p) => pathname?.startsWith(p));

    (async () => {
      try {
        if (isPublic) return;

        const { data } = await supa.auth.getSession();
        const ok = !!data.session?.user?.id;

        if (!ok) {
          window.location.replace('/login');
          return;
        }
      } finally {
        if (alive) setChecked(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [pathname, supa]);

  // opcional: evita flash (pode remover se preferir)
  if (!checked && !PUBLIC_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

  return null;
}
