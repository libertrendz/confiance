// app/login/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import getBrowserSupabase from '@/lib/supa'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supa = useMemo(() => getBrowserSupabase(), [])
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [hasSession, setHasSession] = useState(false)
  const next = params.get('next') || '/menu'

  useEffect(() => {
    // NÃO redireciona automaticamente — só informa e mostra botão.
    ;(async () => {
      const { data } = await supa.auth.getUser()
      setHasSession(!!data.user)
    })()
  }, [supa])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null); setErr(null)
    try {
      const { error } = await supa.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
        },
      })
      if (error) throw error
      setMsg('Enviámos um link mágico para o seu email.')
    } catch (e:any) {
      setErr(e?.message ?? 'Erro ao enviar link.')
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Entrar</h1>

      {hasSession && (
        <div style={{ marginBottom: 12, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
          <div style={{ marginBottom: 8 }}>Sessão ativa encontrada.</div>
          <button
            onClick={() => router.replace(next)}
            style={{ padding: '8px 12px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}
          >
            Ir para o menu
          </button>
        </div>
      )}

      <form onSubmit={enviar} style={{ display: 'grid', gap: 8 }}>
        <label>Email
          <input
            type="email"
            required
            value={email}
            onChange={e=>setEmail(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>
        <button type="submit" style={{ padding: '10px 14px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}>
          Enviar Magic Link
        </button>
      </form>

      {msg && <p style={{ marginTop: 8, color: '#14532d' }}>{msg}</p>}
      {err && <p style={{ marginTop: 8, color: '#7f1d1d' }}>{err}</p>}
    </div>
  )
}
