// app/api/admin/users/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { user_id, nome, papel } = await req.json();
    if (!user_id) {
      return NextResponse.json({ ok: false, error: 'user_id é obrigatório' }, { status: 400 });
    }

    const admin = getServiceSupabase();

    // Atualiza perfil
    const { error: upErr } = await admin.from('profiles')
      .update({
        nome: nome || null,
        nome_exibicao: nome || null,
        papel: papel || null
      })
      .eq('user_id', user_id);
    if (upErr) throw upErr;

    // Reflete no metadata
    if (nome || papel) {
      const { error: metaErr } = await admin.auth.admin.updateUserById(user_id, {
        user_metadata: {
          ...(nome ? { nome_exibicao: nome } : {}),
          ...(papel ? { app_role: papel } : {})
        }
      });
      if (metaErr) throw metaErr;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
