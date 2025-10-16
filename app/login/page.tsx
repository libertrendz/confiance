// app/login/page.tsx
'use client';

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supa } from '../../lib/supa'

export default function LoginPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const next = sp.get('next') || '/menu'

  const [email, setEmail] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supa.auth.getUser()
      if (data.user) setUserEmail(data.user.email ?? null)
      setLoading(false)
    })()
  }, [])

  async function enviarMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null); setErr(null)
    try {
      const origin = window.location.origin
      const emailRedirectTo = `${origin}/auth/confirm?next=${encodeURIComponent(next)}`
      const { error } = await supa.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo }
      })
      if (error) throw error
      setMsg('Enviámos um link de acesso para o seu email.')
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao enviar link')
    }
  }

  if (loading) return <div style={{padding:24}}>A carregar…</div>

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Entrar</h1>

      {userEmail && (
        <div style={{marginBottom:12, padding:12, border:'1px solid #eee', borderRadius:10}}>
          <div>Você já está autenticado como <b>{userEmail}</b>.</div>
          <button
            onClick={() => router.replace(next)}
            style={{ marginTop:8, padding:'8px 12px', border:'1px solid #111', background:'#111', color:'#fff', borderRadius:8 }}
          >
            Ir para o menu
          </button>
        </div>
      )}

      {!userEmail && (
        <form onSubmit={enviarMagicLink} style={{ display: 'grid', gap: 8 }}>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }}
            />
          </label>
          <button type="submit" style={{ padding: "10px 14px", border: "1px solid #111", background: "#111", color: "#fff", borderRadius: 8 }}>
            Enviar Magic Link
          </button>
        </form>
      )}

      {msg && <p style={{ marginTop: 8, color: "#14532d" }}>{msg}</p>}
      {err && <p style={{ marginTop: 8, color: "#7f1d1d" }}>{err}</p>}
    </div>
  )
}
