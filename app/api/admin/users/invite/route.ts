// app/api/admin/users/invite/route.ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { email, nome, papel, empresa_id } = await req.json();

    if (!email || !papel) {
      return NextResponse.json({ ok: false, error: 'email e papel são obrigatórios' }, { status: 400 });
    }

    const admin = getServiceSupabase();

    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/confirm?next=/menu`;

    // Cria user pendente + envia email de confirmação
    const { data: signData, error: signErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        nome_exibicao: nome || null,
        app_role: papel,      // usado no JWT
        empresa_id: empresa_id || null
      },
      // link de confirmação
      redirectTo,
    });

    if (signErr) throw signErr;

    const newId = signData.user?.id;

    // Cria profile “shadow” (idempotente)
    if (newId) {
      await admin.from('profiles').insert({
        user_id: newId,
        nome: nome || null,
        nome_exibicao: nome || null,
        papel,
        empresa_id: empresa_id || null,
      }, { upsert: true });
    }

    return NextResponse.json({ ok: true, user_id: newId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
