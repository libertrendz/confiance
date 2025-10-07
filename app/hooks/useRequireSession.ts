'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useRequireSession() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function check() {
      const { data } = await supabase.auth.getSession();
      const hasSession = !!data.session;

      if (!hasSession) {
        router.replace('/login');
      } else {
        // escuta signOut noutras abas/dispositivos
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_OUT') router.replace('/login');
        });
        // cleanup
        if (isMounted) {
          setLoading(false);
        }
        return () => {
          sub.subscription.unsubscribe();
        };
      }
      if (isMounted) setLoading(false);
    }

    check();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return { loading };
}
