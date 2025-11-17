// app/api/ops/supabase/schema/route.ts
import { NextResponse } from "next/server";
import { getSchemaResumo } from "@/lib/ops/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const schema = await getSchemaResumo();

    return NextResponse.json(
      {
        ok: true,
        ...schema,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[OPS] supabase/schema erro:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Erro ao obter schema",
      },
      { status: 500 }
    );
  }
}
