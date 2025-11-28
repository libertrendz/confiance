// app/api/admin/users/update/route.ts
// Route handler (app-router) para actualizar user/profile e revalidar ISR.
// Substitui o arquivo inteiro por este conteúdo.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_ADMIN_SECRET = process.env.API_ADMIN_SECRET!;
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET!;
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://erp-confiance.vercel.app';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

export async function POST(req: Request) {
  try {
    // Autenticação simples: header x-admin-secret
    const provided = req.headers.get('x-admin-secret');
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
    } catch (err) {
      console.error('revalidate call failed', err);
    }

    return NextResponse.json({ ok: true, updated: true, revalidated, profile: updatedProfile }, { status: 200 });
  } catch (err: any) {
    console.error('Unhandled error in admin/users/update', err);
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}
