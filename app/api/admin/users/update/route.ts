// app/api/admin/users/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const { user_id, nome, papel } = await req.json();
    if (!user_id) return NextResponse.json({ error: 'user_id em falta' }, { status: 400 });
    const role = (papel || 'externo') as Papel;
    const empresa_id = process.env.CONF_EMPRESA_ID || null;

    const supa = getServiceSupabase();

    // upsert em profiles
    const payload: any = {
      user_id,
      empresa_id,
      papel: role,
      nome: nome || null,
      nome_exibicao: nome || null,
    };
    const { error: upErr } = await supa
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    // metadata (JWT)
    await supa.auth.admin.updateUserById(user_id, {
      user_metadata: { app_role: role, nome, nome_exibicao: nome || null }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro inesperado' }, { status: 500 });
  }
}
