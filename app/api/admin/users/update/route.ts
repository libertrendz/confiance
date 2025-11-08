// app/api/admin/users/update/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const supa = getServiceSupabase();
    const body = await req.json().catch(() => ({}));

    const user_id = String(body?.user_id || '');
    if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 });

    const updates: any = {};
    if (body?.nome !== undefined) updates.nome = String(body.nome || '');
    if (body?.nome_exibicao !== undefined) updates.nome_exibicao = String(body.nome_exibicao || '');
    if (body?.papel !== undefined) {
      const papel = String(body.papel) as Papel;
      if (!['admin', 'gestor', 'externo'].includes(papel)) {
        return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });
      }
      updates.papel = papel;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ ok: true, message: 'Nada para atualizar' });
    }

    updates.updated_at = new Date().toISOString();

    // Atualiza profiles
    const { error: upErr } = await supa
      .from('profiles')
      .update(updates)
      .eq('user_id', user_id);
    if (upErr) throw new Error(upErr.message);

    // Sincroniza metadata do Auth
    const meta: any = {};
    if (updates.papel) meta.app_role = updates.papel;
    if (updates.nome_exibicao) meta.nome_exibicao = updates.nome_exibicao;
    if (updates.nome) meta.nome = updates.nome;

    if (Object.keys(meta).length) {
      const { error: metaErr } = await supa.auth.admin.updateUserById(user_id, { user_metadata: meta });
      if (metaErr) throw new Error(metaErr.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao atualizar' }, { status: 500 });
  }
}
