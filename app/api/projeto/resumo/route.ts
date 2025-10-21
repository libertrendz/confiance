// app/api/projeto/resumo/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // projeto padrão (o 1º do usuário/empresa)
  const { data: prj } = await supa
    .from('projetos')
    .select('id,nome')
    .order('created_at', { ascending: true })
    .limit(1).single()

  if (!prj) return NextResponse.json({ fases: [] })

  const { data: fases } = await supa
    .from('fases')
    .select('id,nome')
    .eq('projeto_id', prj.id)
    .order('nome')

  const { data: gastos } = await supa
    .from('vw_resumo_fases') // se não tiver, pode ser uma RPC/VIEW; se não, somas diretas
    .select('*')
    .eq('projeto_id', prj.id)

  return NextResponse.json({
    projeto: prj,
    fases: (fases ?? []).map((f) => {
      const g = (gastos ?? []).find((x: any) => x.fase_id === f.id)
      return {
        faseId: f.id,
        fase: f.nome,
        planeado: Number(g?.planeado ?? 0),
        executado: Number(g?.executado ?? 0),
        perc: g?.planeado ? Math.round((g.executado / g.planeado) * 100) : 0,
        risco: g?.planeado ? g.executado >= 0.9 * g.planeado : false,
      }
    }),
  })
}
