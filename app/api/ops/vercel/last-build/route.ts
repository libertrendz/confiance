// app/api/ops/vercel/last-build/route.ts
import { NextResponse } from "next/server";
import { getLastDeployment } from "@/lib/ops/vercel";

export const runtime = "nodejs";

export async function GET() {
  try {
    const deployment = await getLastDeployment();

    return NextResponse.json(
      {
        ok: true,
        deployment,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[OPS] vercel/last-build erro:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Erro ao obter último deploy",
      },
      { status: 500 }
    );
  }
}
