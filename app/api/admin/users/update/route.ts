// app/api/admin/users/update/route.ts
// Versão corrigida: cria client SUPABASE de forma lazy dentro do handler
// Evita executar código que requer env vars no momento do build.

import { NextResponse } from 'next/server';
import type { Database } from '@/lib/database_types'; // opcional: se tiveres types
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const API_ADMIN_SECRET = process.env.API_ADMIN_SECRET;
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://erp-confiance.vercel.app';

function getSupabaseAdmin(): SupabaseClient {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin env vars missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

export async function POST(req: Request) {
  try {
    // Autenticação simples: header x-admin-secret
    const provided = req.headers.get('x-admin-secret');
    if (!API_ADMIN_SECRET) {
      console.error('API_ADMIN_SECRET not set in environment');
      return NextResponse.json({ ok: false, error: 'Server misconfigured' }, { status: 500 });
    }
    if (!provided || provided !== API_ADMIN_SECRET) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });

    const userId = body.userId as string | undefined;
    const empresaId = body.empresaId as string | undefined;
    const updates = body.updates as Record<string, any> | undefined;

    if (!userId) return NextResponse.json({ ok: false, error: 'Missing userId' }, { status: 400 });
    if (!empresaId) return NextResponse.json({ ok: false, error: 'Missing empresaId' }, { status: 400 });
    if (!updates || typeof updates !== 'object') return NextResponse.json({ ok: false, error: 'Missing updates' }, { status: 400 });

    // criar client apenas quando necessario (evita erro em build)
    let supabaseAdmin;
    try {
      supabaseAdmin = getSupabaseAdmin();
    } catch (e: any) {
      console.error('Supabase env missing at runtime:', e.message);
      return NextResponse.json({ ok: false, error: 'Server not configured for DB operations' }, { status: 500 });
    }

    // Proteções: impedir alterações indevidas
    delete updates.id;
    updates.empresa_id = empresaId;

    // Executa update (server-side, bypass RLS)
    const { data: updatedProfile, error: updateErr } = await supabaseAdmin
      .from('profile')
      .update(updates)
      .eq('id', userId)
      .eq('empresa_id', empresaId)
      .select('*')
      .single();

    if (updateErr) {
      console.error('supabase update error', updateErr);
      return NextResponse.json({ ok: false, error: 'DB update error: ' + (updateErr.message ?? updateErr) }, { status: 500 });
    }

    // Grava audit (não bloqueia se falhar)
    try {
      await supabaseAdmin.from('profile_audit').insert({
        empresa_id: empresaId,
        usuario_id: userId,
        action: 'update_profile',
        payload: updates
      });
    } catch (auditErr) {
      console.warn('profile_audit insert failed', auditErr);
    }

    // Chama endpoint de revalidate (usa secret guardada no Vercel)
    let revalidated = false;
    try {
      if (!REVALIDATE_SECRET) {
        console.warn('REVALIDATE_SECRET not set; skipping revalidate call');
      } else {
        const resp = await fetch(`${APP_ORIGIN}/api/revalidate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-revalidate-secret': REVALIDATE_SECRET
          },
          body: JSON.stringify({ path: `/profile/${userId}` })
        });
        if (resp.ok) revalidated = true;
        else {
          const txt = await resp.text().catch(() => 'no-body');
          console.warn('revalidate returned not OK', resp.status, txt);
        }
      }
    } catch (err) {
      console.error('revalidate call failed', err);
    }

    return NextResponse.json({ ok: true, updated: true, revalidated, profile: updatedProfile }, { status: 200 });
  } catch (err: any) {
    console.error('Unhandled error in admin/users/update', err);
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}
