// app/api/admin/users/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { user_id, nome_exibicao, papel } = await req.json();
    if (!user_id) {
      return NextResponse.json({ ok: false, error: 'missing_user_id' }, { status: 400 });
    }
    if (papel && !['admin','gestor','externo'].includes(papel)) {
      return NextResponse.json({ ok: false, error: 'invalid_role' }, { status: 400 });
    }

    const empresa_id = process.env.CONF_EMPRESA_ID;
    if (!empresa_id) throw new Error('CONF_EMPRESA_ID ausente');

    const admin = getServiceSupabase();

    // Atualiza metadata (nome_exibicao, papel opcional)
    const metaUpdate: any = {};
    if (nome_exibicao !== undefined) metaUpdate.nome_exibicao = nome_exibicao;
    if (papel) metaUpdate.app_role = papel;

    if (Object.keys(metaUpdate).length) {
      const { error: updAuthErr } = await admin.auth.admin.updateUserById(user_id, { user_metadata: metaUpdate });
      if (updAuthErr) throw updAuthErr;
    }

    // Upsert profiles
    const patch: any = { user_id, empresa_id };
    if (nome_exibicao !== undefined) patch.nome_exibicao = nome_exibicao;
    if (papel) patch.papel = papel;

    const { error: upErr } = await admin.from('profiles').upsert(patch, { onConflict: 'user_id' });
    if (upErr) throw upErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'update_failed' }, { status: 500 });
  }
}
