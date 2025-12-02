// app/api/admin/users/update/route.ts
// Atualiza perfil em "profiles" tentando user_id primeiro, depois id.
// Grava audit (não bloqueante) e revalida ISR.
// Compatível com SUPABASE_SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY (lazy-init).
// Regra CONFIANCE: nome é canónico e nome_exibicao espelha nome.

import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://erp-confiance.vercel.app';
const TARGET_TABLE = 'profiles';

function makeSupabaseClient(): { client?: SupabaseClient; missing?: string[] } {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY | SUPABASE_SERVICE_ROLE');

  if (missing.length) return { missing };

  const client = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  return { client };
}

/**
 * Helper: run update with given filter
 * Returns { ok, dataRow|null, rowsAffected, errorMessage|null }
 */
async function runUpdate(
  client: SupabaseClient,
  filterKey: 'user_id' | 'id',
  filterValue: string,
  empresaId: string,
  updates: Record<string, any>
) {
  try {
    const qb = client
      .from(TARGET_TABLE)
      .update(updates)
      .eq(filterKey, filterValue)
      .eq('empresa_id', empresaId)
      .select('*'); // don't force single() here

    const { data, error } = await qb;

    if (error) {
      return { ok: false, data: null, rows: null, error: error.message ?? String(error) };
    }

    if (data === null) {
      return { ok: false, data: null, rows: 0, error: null };
    }

    if (Array.isArray(data)) {
      if (data.length === 0) return { ok: false, data: null, rows: 0, error: null };
      if (data.length === 1) return { ok: true, data: data[0], rows: 1, error: null };
      // multiple rows updated — return error detail
      return {
        ok: false,
        data: data,
        rows: data.length,
        error: `Multiple rows (${data.length}) updated`,
      };
    } else {
      // object — single row
      return { ok: true, data: data, rows: 1, error: null };
    }
  } catch (err: any) {
    return { ok: false, data: null, rows: null, error: String(err.message || err) };
  }
}

export async function POST(req: Request) {
  try {
    // ----- Auth admin ----- //
    const provided = req.headers.get('x-admin-secret');
    const API_ADMIN_SECRET = process.env.API_ADMIN_SECRET;
    if (!API_ADMIN_SECRET) {
      console.error('API_ADMIN_SECRET missing');
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured (API_ADMIN_SECRET)' },
        { status: 500 }
      );
    }
    if (!provided || provided !== API_ADMIN_SECRET) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body)
      return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });

    const userId = body.userId as string | undefined;
    const empresaId = body.empresaId as string | undefined;
    const updates = body.updates as Record<string, any> | undefined;

    if (!userId)
      return NextResponse.json({ ok: false, error: 'Missing userId' }, { status: 400 });
    if (!empresaId)
      return NextResponse.json({ ok: false, error: 'Missing empresaId' }, { status: 400 });
    if (!updates || typeof updates !== 'object')
      return NextResponse.json({ ok: false, error: 'Missing updates' }, { status: 400 });

    const { client, missing } = makeSupabaseClient();
    if (missing && missing.length) {
      console.error('Missing env:', missing);
      return NextResponse.json(
        { ok: false, error: `Missing env: ${missing.join(', ')}` },
        { status: 500 }
      );
    }
    if (!client)
      return NextResponse.json(
        { ok: false, error: 'Could not initialize DB client' },
        { status: 500 }
      );

    // ----- Regra de negócio: nome / nome_exibicao ----- //
    // Se houver "nome", ele é canónico. Garantimos que nome_exibicao espelha.
    if (typeof updates.nome === 'string' && updates.nome.trim().length > 0) {
      const cleanName = updates.nome.trim();
      updates.nome = cleanName;
      updates.nome_exibicao = cleanName;
    } else if (
      // fallback: se vier só nome_exibicao, espelha em nome
      (!updates.nome || !String(updates.nome).trim()) &&
      typeof updates.nome_exibicao === 'string' &&
      updates.nome_exibicao.trim().length > 0
    ) {
      const cleanName = updates.nome_exibicao.trim();
      updates.nome = cleanName;
      updates.nome_exibicao = cleanName;
    }

    // sanitize & enforce tenant
    delete updates.id;
    updates.empresa_id = empresaId;
    updates.updated_at = new Date().toISOString();

    // 1) try by user_id (most common: user auth id)
    const attemptUserId = await runUpdate(client, 'user_id', userId, empresaId, updates);
    if (attemptUserId.ok) {
      const updatedProfile = attemptUserId.data;

      // audit (non-blocking)
      (async () => {
        try {
          await client.from('profile_audit').insert({
            empresa_id: empresaId,
            usuario_id: userId,
            action: 'update_profile',
            payload: updates,
          });
        } catch (e) {
          console.warn('profile_audit insert failed', e);
        }
      })();

      // revalidate
      let revalidated = false;
      try {
        const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;
        if (REVALIDATE_SECRET) {
          const resp = await fetch(`${APP_ORIGIN}/api/revalidate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-revalidate-secret': REVALIDATE_SECRET,
            },
            body: JSON.stringify({ path: `/profile/${userId}` }),
          });
          if (resp.ok) revalidated = true;
        }
      } catch (e) {
        console.warn('revalidate failed', e);
      }

      return NextResponse.json(
        { ok: true, updated: true, by: 'user_id', profile: updatedProfile, revalidated },
        { status: 200 }
      );
    }

    // If no rows updated and no DB error -> try by profile id
    if (!attemptUserId.error && attemptUserId.rows === 0) {
      const attemptId = await runUpdate(client, 'id', userId, empresaId, updates);
      if (attemptId.ok) {
        const updatedProfile = attemptId.data;

        (async () => {
          try {
            await client.from('profile_audit').insert({
              empresa_id: empresaId,
              usuario_id: userId,
              action: 'update_profile',
              payload: updates,
            });
          } catch (e) {
            console.warn('profile_audit insert failed', e);
          }
        })();

        let revalidated = false;
        try {
          const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;
          if (REVALIDATE_SECRET) {
            const resp = await fetch(`${APP_ORIGIN}/api/revalidate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': REVALIDATE_SECRET,
              },
              body: JSON.stringify({ path: `/profile/${userId}` }),
            });
            if (resp.ok) revalidated = true;
          }
        } catch (e) {
          console.warn('revalidate failed', e);
        }

        return NextResponse.json(
          { ok: true, updated: true, by: 'id', profile: updatedProfile, revalidated },
          { status: 200 }
        );
      }

      // If attemptId returned an error, send it
      if (attemptId.error) {
        return NextResponse.json(
          { ok: false, error: 'DB update error', detail: { table: TARGET_TABLE, error: attemptId.error } },
          { status: 500 }
        );
      }
      // else attemptId.rows === 0 -> no rows updated
      return NextResponse.json(
        { ok: false, error: 'No rows updated', detail: { table: TARGET_TABLE } },
        { status: 404 }
      );
    }

    // If attemptUserId returned an error different than "no rows"
    if (attemptUserId.error) {
      return NextResponse.json(
        { ok: false, error: 'DB update error', detail: { table: TARGET_TABLE, error: attemptUserId.error } },
        { status: 500 }
      );
    }

    // fallback
    return NextResponse.json(
      { ok: false, error: 'Unknown update failure' },
      { status: 500 }
    );
  } catch (err: any) {
    console.error('Unhandled error in admin/users/update', err);
    return NextResponse.json(
      { ok: false, error: String(err.message || err) },
      { status: 500 }
    );
  }
}
