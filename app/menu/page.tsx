'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supa'
import { getFlags } from '@/lib/flags'

type FaseResumo = {
  faseId: string
  fase: string
  planeado: number
  executado: number
  perc: number
  risco: boolean
}

export default function MenuPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [fases, setFases] = useState<FaseResumo[]>([])
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const supa = getBrowserSupabase()
        // 1) check auth
        const { data } = await supa.auth.getUser()
        if (!data.user) {
          const next = encodeURIComponent('/menu')
          router.replace(`/login?next=${next}`)
          return
        }
        setEmail(data.user.email ?? null)

        // 2) flags (opcional)
        const f = await getFlags()
        setFlags(f)

        // 3) resumo (se a API existir)
        const res = await fetch('/api/projeto/resumo', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          setFases(json?.fases ?? [])
        } else {
          setFases([])
        }
      } catch (e: any) {
        setErr(e?.message ?? 'Erro ao carregar menu')
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  async function sair() {
    const supa = getBrowserSupabase()
    await supa.auth.signOut()
    router.replace('/login')
  }

  if (loading) return <div style={{ padding: 24 }}>A carregar…</div>
  if (err) return <div style={{ padding: 24, color: '#7f1d1d' }}>Erro: {err}</div>

  const totalPlaneado = fases.reduce((a, c) => a + (c.planeado || 0), 0)
  const totalExec = fases.reduce((a, c) => a + (c.executado || 0), 0)
  const perc = totalPlaneado > 0 ? Math.round((totalExec / totalPlaneado) * 100) : 0

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Menu</h1>
        <div>
          <span style={{ marginRight: 12 }}>{email}</span>
          <button onClick={sair} style={{ padding: '8px 12px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}>
            Sair
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 16, border: '1px solid #eee', borderRadius: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Resumo do Projeto</h2>
        <p>
          <b>Planeado:</b> € {totalPlaneado.toFixed(2)} &nbsp;|&nbsp; <b>Executado:</b> € {totalExec.toFixed(2)} &nbsp;|&nbsp; <b>{perc}%</b>
        </p>
      </div>

      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {fases.map((f) => (
          <div key={f.faseId} style={{ padding: 16, border: '1px solid #eee', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>{f.fase}</h3>
              {f.risco && <span style={{ fontSize: 12, color: '#7f1d1d' }}>⚠ perto do limite</span>}
            </div>
            <p style={{ marginTop: 4 }}>
              Planeado: € {f.planeado.toFixed(2)} &nbsp;|&nbsp; Executado: € {f.executado.toFixed(2)} &nbsp;|&nbsp; {f.perc}%
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {flags['despesas_nova'] !== false && (
          <a href="/adm/despesas/nova" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '10px 14px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}>
              + Lançar Despesa
            </button>
          </a>
        )}
      </div>
    </div>
  )
}
