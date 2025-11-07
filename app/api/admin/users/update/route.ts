import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { user_id, nome, nome_exibicao, papel } = body || {};

  if (!user_id) return NextResponse.json({ error: 'missing_user_id' }, { status: 400 });

  const supa = getServerSupabase();

  // sessão + empresa + papel do editor
  const { data: u } = await supa.auth.getUser();
  const editorId = u.user?.id;
  if (!editorId) return NextResponse.json({ error: 'no_session' }, { status: 401 });

  const { data: editorProf } = await supa
    .from('profiles')
    .select('empresa_id,papel')
    .eq('user_id', editorId)
    .maybeSingle();

  if (!editorProf?.empresa_id) {
    return NextResponse.json({ error: 'no_empresa' }, { status: 400 });
  }
  if (!['admin', 'gestor'].includes(editorProf.papel as string)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // atualização: apenas dentro da mesma empresa
  const { error } = await supa
    .from('profiles')
    .update({
      nome: nome ?? null,
      nome_exibicao: nome_exibicao ?? null,
      papel: papel ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user_id)
    .eq('empresa_id', editorProf.empresa_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
