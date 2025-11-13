// components/Topbar.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

const LOGO =
  'https://cfremxfgqehqnbqummti.supabase.co/storage/v1/object/public/images/LOGO%20CONFIANCE.png';

type AppRole = 'admin' | 'gestor' | 'externo';

export default function Topbar() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supa.auth.getUser();
      const user = data.user;
      setEmail(user?.email ?? null);

      const meta = (user?.user_metadata || {}) as Record<string, any>;
      let r: AppRole = (meta.app_role as AppRole) || 'externo';

      // tenta complementar via profiles
      if (user?.id) {
        const { data: prof } = await supa
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        if (prof?.role && ['admin', 'gestor', 'externo'].includes(prof.role)) {
          r = prof.role as AppRole;
        }
      }
      setRole(r);
    })();
  }, [supa]);

  async function sair() {
    try { await supa.auth.signOut(); } catch {}
    window.location.replace('/login');
  }

  return (
    <div className="topbar">
      <div className="brand">
        <img src={LOGO} alt="CONFIANCE" className="brand-logo" />
        <span className="brand-name">CONFIANCE</span>
      </div>

      <div className="user">
        {role && <span className="pill">{role.toUpperCase()}</span>}
        {email && <span className="user-email" title={email}>{email}</span>}
        <button className="btn btn-ghost" onClick={sair}>Sair</button>
      </div>
    </div>
  );
}
