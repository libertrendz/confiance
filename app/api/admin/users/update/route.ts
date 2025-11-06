// app/api/admin/users/update/route.ts
import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabaseAdmin';

type Papel = 'admin'|'gestor'|'externo';

export async function POST(req: Request) {
  try {
    const supa = getAdminSupabase();
    const { user_id, nome, papel } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: 'missing user_id' }, { status: 400 });
    }
    const papelOk = (['admin','gestor','externo'] as Papel[]).includes(papel);
    if (!papelOk) {
      return NextResponse.json({ error: 'papel inválido' }, { status: 400 });
    }

    // 1) Atualiza user_metadata.app_role (Auth Admin API)
    {
      const { error } = await supa.auth.admin.updateUserById(user_id, {
        user_metadata: { app_role: papel },
      });
      if (error) {
        return NextResponse.json({ error: 'auth.updateUser failed', details: error.message }, { status: 500 });
      }
    }

    // 2) Upsert em profiles (garante linha e atualiza nome/papel)
    {
      // Se tua tabela profiles tem (id uuid PK = auth.user.id)
      const { error } = await supa
        .from('profiles')
        .upsert(
          { id: user_id, nome: (nome ?? '').trim() || null, papel: papel as Papel },
          { onConflict: 'id' }
        );
      if (error) {
        return NextResponse.json({ error: 'profiles.upsert failed', details: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'unhandled', details: e?.message || String(e) }, { status: 500 });
  }
}