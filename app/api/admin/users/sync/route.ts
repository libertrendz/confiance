// app/api/admin/users/sync/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Rota ADMIN para sincronizar dados de usuário do ERP -> Supabase Auth.
 *
 * Uso esperado:
 * - Chamado APÓS o desktop/ERP atualizar os dados do usuário na base interna
 * - Garante que o login externo (Auth) reflita nome/email atuais
 *
 * Segurança:
 * - Protegido via x-admin-secret
 * - Usa SERVICE ROLE (auth.admin.updateUserById)
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const API_ADMIN_SECRET = process.env.API_ADMIN_SECRET!;

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(req: Request) {
  try {
    // ----- Segurança ADMIN ----- //
    const provided = req.headers.get('x-admin-secret');
    if (!provided || provided !== API_ADMIN_SECRET) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      console.error('Missing Supabase envs for admin sync.');
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const userId: string | undefined = body.userId;
    const nome: string | undefined = body.nome ?? body.name ?? body.full_name;
    const email: string | undefined = body.email;
    const empresaId: string | undefined = body.empresaId ?? body.empresa_id;
    const extraMetadata: Record<string, any> = body.metadata ?? {};

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Monta objeto de update para Auth
    const updatePayload: any = {
      user_metadata: {
        ...(nome ? { full_name: nome, displayName: nome } : {}),
        ...(empresaId ? { empresa_id: empresaId } : {}),
        ...extraMetadata,
        updated_at: new Date().toISOString(),
      },
    };

    if (email) {
      updatePayload.email = email;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      updatePayload
    );

    if (error) {
      console.error('auth.admin.updateUserById error', error);
      return NextResponse.json(
        { ok: false, error: String(error.message || error) },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, result: data },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('admin/users/sync unhandled error', err);
    return NextResponse.json(
      { ok: false, error: String(err.message || err) },
      { status: 500 }
    );
  }
}
