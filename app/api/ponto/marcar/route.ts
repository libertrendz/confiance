// app/api/ponto/marcar/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type PontoTipo = string; // ex.: "entrada", "saida" — tem de bater com o enum tipo no DB

interface PontoMarcarPayload {
  empresa_id: string;      // public.empresas.id
  funcionario_id: string;  // public.colaboradores.id
  user_id: string;         // auth.users.id (Supabase)
  tipo: PontoTipo;         // teu enum existente em pontos.tipo
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  foto_url?: string;
  origem?: string;
  tz_client?: string;
  device_time?: string;
  obs?: string;
}

export async function POST(req: NextRequest) {
  let body: PontoMarcarPayload;

  try {
    body = (await req.json()) as PontoMarcarPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido" },
      { status: 400 }
    );
  }

  // Validação mínima
  if (!body.empresa_id || !body.funcionario_id || !body.user_id || !body.tipo) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Campos obrigatórios: empresa_id, funcionario_id, user_id, tipo",
      },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.OPS_SUPABASE_URL;
  const serviceRole = process.env.OPS_SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !serviceRole) {
    console.error(
      "[PONTO] OPS_SUPABASE_URL ou OPS_SUPABASE_SERVICE_ROLE não configurados."
    );
    return NextResponse.json(
      { ok: false, error: "Configuração Supabase ausente no servidor" },
      { status: 500 }
    );
  }

  const insertPayload = {
    empresa_id: body.empresa_id,
    funcionario_id: body.funcionario_id,
    user_id: body.user_id,
    tipo: body.tipo,
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    accuracy: body.accuracy ?? null,
    foto_url: body.foto_url ?? null,
    origem: body.origem ?? "online",
    tz_client: body.tz_client ?? null,
    device_time: body.device_time ?? null,
    obs: body.obs ?? null,
    // ocorrido_em, status, ts_servidor, created_at, updated_at
    // usam os defaults já definidos na tabela public.pontos
  };

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/pontos`, {
      method: "POST",
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(insertPayload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[PONTO] Erro ao inserir em pontos:", res.status, text);
      return NextResponse.json(
        {
          ok: false,
          error: "Erro ao gravar marcação de ponto",
          detail: text,
        },
        { status: 500 }
      );
    }

    const data = (await res.json()) as any[];
    const row = data?.[0] ?? null;

    return NextResponse.json(
      {
        ok: true,
        ponto: row,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[PONTO] Exceção ao gravar ponto:", err);
    return NextResponse.json(
      { ok: false, error: "Exceção ao gravar marcação de ponto" },
      { status: 500 }
    );
  }
}
