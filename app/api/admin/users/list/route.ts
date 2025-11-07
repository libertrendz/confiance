import { NextResponse } from 'next/server';
import { getAdminClient } from '../../_supabase';

export async function GET() {
  try {
    const supa = getAdminClient();

    // users do Auth
    const { data: authUsers, error: auErr } = await supa.auth.admin.listUsers();
    if (auErr) throw auErr;

    // profiles (nome/papel)
    const { data: profs, error: pErr } = await supa
      .from('profiles')
      .select('user_id, nome_exibicao, papel');
    if (pErr) throw pErr;

    const profById = new Map(profs?.map(p => [p.user_id, p]) ?? []);
    const rows = (authUsers?.users ?? []).map(u => {
      const prof = profById.get(u.id) || null;
      return {
        id: u.id,
        email: u.email,
        nome: prof?.nome_exibicao ?? null,
        papel: prof?.papel ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      };
    });

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'fail' }, { status: 500 });
  }
}
