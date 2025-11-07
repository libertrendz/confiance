import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, nome, papel } = body || {};

  if (!email || !papel) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  // valida papel permitido
  if (!['externo', 'gestor', 'admin'].includes(papel)) {
    return NextResponse.json({ error: 'invalid_papel' }, { status: 400 });
  }

  const supa = getServerSupabase();

  // quem convida precisa estar autenticado e ter empresa
  const { data: u } = await supa.auth.getUser();
  const inviterId = u.user?.id;
  if (!inviterId) return NextResponse.json({ error: 'no_session' }, { status: 401 });

  const { data: inviterProf, error: profErr } = await supa
    .from('profiles')
    .select('empresa_id,papel')
    .eq('user_id', inviterId)
    .maybeSingle();
  if (profErr || !inviterProf?.empresa_id) {
    return NextResponse.json({ error: 'no_empresa' }, { status: 400 });
  }
  if (!['admin', 'gestor'].includes(inviterProf.papel as string)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // admin client (service role)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // precisa estar setado no Vercel
    { auth: { persistSession: false } }
  );

  // 1) cria ou obtém utilizador
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: false, // vai receber confirmação por email
    user_metadata: {
      app_role: papel,
      nome_exibicao: nome ?? null,
      nome: nome ?? null,
    },
  });
  if (createErr) {
    return NextResponse.json({ error: `createUser: ${createErr.message}` }, { status: 500 });
  }
  const newUserId = created.user?.id;
  if (!newUserId) {
    return NextResponse.json({ error: 'no_user_created' }, { status: 500 });
  }

  // 2) upsert em profiles com a mesma empresa do convidador
  const { error: upErr } = await admin
    .from('profiles')
    .upsert({
      user_id: newUserId,
      empresa_id: inviterProf.empresa_id,
      papel,
      nome: nome ?? null,
      nome_exibicao: nome ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (upErr) {
    return NextResponse.json({ error: `profiles_upsert: ${upErr.message}` }, { status: 500 });
  }

  // 3) envia email de convite/confirmacão
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/confirm?next=/menu`;
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (inviteErr) {
    return NextResponse.json({ error: `invite: ${inviteErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user_id: newUserId });
}
