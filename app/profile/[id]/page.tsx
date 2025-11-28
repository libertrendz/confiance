// app/profile/[id]/page.tsx
// Server component Next.js (app-router) — renderiza o profile por user_id ou por profile id.
// Usa SUPABASE_URL + SUPABASE_SERVICE_ROLE[_KEY] no server (não exposto ao cliente).

import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  // Não explode no build; se faltar, a página vai dar notFound em runtime com mensagem nos logs.
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE missing');
}

async function getProfileByIdOrUserId(id: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false }
  });

  // 1) tenta por user_id (mais provável)
  try {
    const { data: byUser, error: errUser } = await supabase
      .from('profiles')
      .select('id, user_id, empresa_id, nome, nome_exibicao, created_at, updated_at')
      .eq('user_id', id)
      .limit(1);

    if (errUser) {
      console.warn('Supabase error (by user_id):', errUser.message ?? errUser);
    } else if (byUser && byUser.length) {
      return byUser[0];
    }
  } catch (e) {
    console.warn('Supabase exception (by user_id)', e);
  }

  // 2) fallback por profile.id
  try {
    const { data: byId, error: errId } = await supabase
      .from('profiles')
      .select('id, user_id, empresa_id, nome, nome_exibicao, created_at, updated_at')
      .eq('id', id)
      .limit(1);

    if (errId) {
      console.warn('Supabase error (by id):', errId.message ?? errId);
    } else if (byId && byId.length) {
      return byId[0];
    }
  } catch (e) {
    console.warn('Supabase exception (by id)', e);
  }

  return null;
}

export default async function Page({ params }: { params: { id: string } }) {
  const id = params.id;
  const profile = await getProfileByIdOrUserId(id);

  if (!profile) {
    // devolve 404 do Next — mantém UX consistente
    notFound();
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>{profile.nome_exibicao ?? profile.nome ?? 'Utilizador sem nome'}</h1>
      <p><strong>Empresa:</strong> {profile.empresa_id}</p>
      <p><strong>User ID:</strong> {profile.user_id}</p>
      <hr />
      <details>
        <summary>Dados brutos</summary>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(profile, null, 2)}</pre>
      </details>
    </main>
  );
}
