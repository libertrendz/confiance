// app/api/admin/users/invite/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Papel = 'admin' | 'gestor' | 'externo';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const rawEmail = (body as any)?.email ?? '';
    const email = String(rawEmail).trim().toLowerCase();

    const rawNome = (body as any)?.nome ?? '';
    const nome = String(rawNome).trim() || null;

    const papel = String((body as any)?.papel || 'externo') as Papel;

    if (!email) {
      return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
    }
    if (!['admin', 'gestor', 'externo'].includes(papel)) {
      return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });
    }

    const supa = getServiceSupabase();
    const redirectTo = `${new URL(req.url).origin}/auth/confirm?next=/menu`;

    // 1) Envia convite; se já existir, segue o baile
    const { data: invited, error: invErr } = await supa.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { app_role: papel, nome, nome_exibicao: nome },
    });

    if (invErr && !invErr.message?.includes('already registered')) {
      return NextResponse.json(
        { error: `Invite falhou: ${invErr.message}` },
        { status: 400 },
      );
    }

    // 2) Tenta obter o user_id
    let userId: string | null = invited?.user?.id ?? null;

    if (!userId) {
      const { data: lu, error: le } = await supa.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (le) {
        return NextResponse.json(
          { error: `Lookup falhou: ${le.message}` },
          { status: 400 },
        );
      }

      // TS aqui vira neve, então tratamos tudo como any
      const users = (lu as any)?.users as any[] | undefined;
      const found = users?.find(
        (u: any) =>
          typeof u?.email === 'string' && u.email.toLowerCase() === email,
      );
      userId = found?.id ?? null;
    }

    if (!userId) {
      // convite enviado mas sem id — aceitável
      return NextResponse.json(
        { ok: true, note: 'Convite enviado; user_id ainda indisponível.' },
        { status: 202 },
      );
    }

    // 3) Upsert em profiles (empresa_id vem pelos defaults do DB)
    const payload = {
      user_id: userId,
      papel,
      nome,
      nome_exibicao: nome,
    };

    const { error: upErr } = await supa
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' });

    if (upErr) {
      return NextResponse.json(
        { error: `Upsert profile falhou: ${upErr.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Erro desconhecido' },
      { status: 500 },
    );
  }
}
