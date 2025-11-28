// app/api/pages/api/profile/update.ts
// Next.js API Route (TypeScript)
// - Atualiza o profile no Supabase (server-side, usa SERVICE_ROLE_KEY)
// - Grava um registro de audit em profile_audit (se existir)
// - Revalida a página ISR para /profile/:id com res.revalidate
//
// Requisitos (Vercel env vars):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   API_ADMIN_SECRET
//
// Uso (server-to-server): POST /api/profile/update
// Headers: { "Content-Type": "application/json", "x-admin-secret": "<API_ADMIN_SECRET>" }
// Body: { userId: string, empresaId: string, updates: { <colunas do profile> } }

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type Data =
  | { ok: true; updated: boolean; revalidated?: boolean; profile?: any }
  | { ok: false; error: string };

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_ADMIN_SECRET = process.env.API_ADMIN_SECRET!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !API_ADMIN_SECRET) {
  console.error('Missing required env vars: SUPABASE_URL | SUPABASE_SERVICE_ROLE_KEY | API_ADMIN_SECRET');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const provided = Array.isArray(req.headers['x-admin-secret'])
    ? req.headers['x-admin-secret'][0]
    : (req.headers['x-admin-secret'] as string | undefined);

  if (!provided || provided !== API_ADMIN_SECRET) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const body = req.body || {};
  const userId = body.userId as string | undefined;
  const empresaId = body.empresaId as string | undefined;
  const updates = body.updates as Record<string, any> | undefined;

  if (!userId) return res.status(400).json({ ok: false, error: 'Missing userId' });
  if (!empresaId) return res.status(400).json({ ok: false, error: 'Missing empresaId' });
  if (!updates || typeof updates !== 'object') return res.status(400).json({ ok: false, error: 'Missing updates object' });

  try {
    delete updates.id;
    updates.empresa_id = empresaId;

    const { data: updatedProfile, error: updateErr } = await supabaseAdmin
      .from('profile')
      .update(updates)
      .eq('id', userId)
      .eq('empresa_id', empresaId)
      .select('*')
      .single();

    if (updateErr) {
      console.error('supabase update error', updateErr);
      return res.status(500).json({ ok: false, error: 'DB update error: ' + updateErr.message });
    }

    try {
      const auditPayload = {
        empresa_id: empresaId,
        usuario_id: userId,
        action: 'update_profile',
        payload: updates
      };
      await supabaseAdmin.from('profile_audit').insert(auditPayload);
    } catch (auditErr) {
      console.warn('profile_audit insert failed', auditErr);
    }

    let revalidated = false;
    try {
      await res.revalidate(`/profile/${userId}`);
      revalidated = true;
    } catch (revalErr) {
      console.error('revalidate error', revalErr);
    }

    return res.status(200).json({ ok: true, updated: true, revalidated, profile: updatedProfile });
  } catch (err: any) {
    console.error('Unhandled error in /api/profile/update', err);
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}
