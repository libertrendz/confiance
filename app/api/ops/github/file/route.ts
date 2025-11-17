// app/api/ops/github/file/route.ts
import { NextResponse } from "next/server";
import { getRepoFile } from "@/lib/ops/github";

export const runtime = "nodejs";

const DEFAULT_OWNER = "libertrendz";
const DEFAULT_REPO = "confiance";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  const ref = searchParams.get("ref") ?? "main";

  if (!path) {
    return NextResponse.json(
      { ok: false, error: "Parâmetro 'path' é obrigatório." },
      { status: 400 }
    );
  }

  try {
    const file = await getRepoFile({
      owner: DEFAULT_OWNER,
      repo: DEFAULT_REPO,
      path,
      ref,
    });

    return NextResponse.json(
      {
        ok: true,
        content: file.content,
        sha: file.sha,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[OPS] github/file erro:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Erro ao ler arquivo",
      },
      { status: 500 }
    );
  }
}
