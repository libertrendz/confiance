// app/api/admin/users/invite/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Papel = 'admin' | 'gestor' | 'externo';

function normEmail(v: any) {
  return String(v || '').trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const email = normEmail((body as any)?.email);
    const rawNome = (body as any)?.nome ?? '';
    const nome = String(rawNome).trim() || null;
    const papel = String((body as any)?.papel || 'externo') as Papel;

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Email obrigatório' }, { status: 400 });
    }
    if (!['admin', 'gestor', 'externo'].includes(papel)) {
      return NextResponse.json({ ok: false, error: 'Papel inválido' }, { status: 400 });
    }

    const supa = getServiceSupabase();

    // 0) Se já existe em Auth, NÃO tenta "invite" (Supabase não envia email)
    //    → regra de negócio: orientar a entrar por Magic Link
    try {
      const { data: lu, error: le } = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (le) throw le;

      const users = (lu as any)?.users as any[] | undefined;
      const found = users?.find((u: any) => typeof u?.email === 'string' && u.email.toLowerCase() === email);

      if (found?.id) {
        // Atualiza perfil (papel/nome) se quiser, mas NÃO promete convite por email
        const payload = {
          user_id: found.id,
          papel,
          nome,
          nome_exibicao: nome,
        };

        await supa.from('profiles').upsert(payload, { onConflict: 'user_id' });

        return NextResponse.json(
          {
            ok: false,
            error: 'Este email já tem utilizador criado. Use o Magic Link no login para entrar.',
            code: 'USER_ALREADY_EXISTS',
          },
          { status: 409 },
        );
      }
    } catch {
      // se falhar o lookup, seguimos (não bloqueia)
    }

    // 1) Envia convite (apenas para utilizador novo)
    // IMPORTANTE: invite deve cair no login depois (para pedir Magic Link)
    const origin = new URL(req.url).origin;
    const redirectTo = `${origin}/auth/confirm?next=/login`;

    const { data: invited, error: invErr } = await supa.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { app_role: papel, nome, nome_exibicao: nome },
    });

    if (invErr) {
      return NextResponse.json({ ok: false, error: `Invite falhou: ${invErr.message}` }, { status: 400 });
    }

    const userId: string | null = invited?.user?.id ?? null;

    // 2) Upsert em profiles (se tiver user_id)
    if (userId) {
      const payload = {
        user_id: userId,
        papel,
        nome,
        nome_exibicao: nome,
      };

      const { error: upErr } = await supa.from('profiles').upsert(payload, { onConflict: 'user_id' });
      if (upErr) {
        return NextResponse.json({ ok: false, error: `Upsert profile falhou: ${upErr.message}` }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Erro desconhecido' }, { status: 500 });
  }
}
