'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import getBrowserSupabase from '@/lib/supa'

export default function LoginPage() {
  const router = useRouter()
  const supa = useMemo(() => getBrowserSupabase(), [])
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'checking'|'logged'|'anon'>('checking')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supa.auth.getUser()
      if (!mounted) return
      setStatus(data.user ? 'logged' : 'anon')
    })()
    return () => { mounted = false }
  }, [supa])

  async function sendMagic(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null); setErr(null)
    try {
      const origin = window.location.origin
      // Vamos pedir para redirecionar ao /auth/confirm
      const { error } = await supa.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // IMPORTANTÍSSIMO: seu template PRECISA usar {{ .RedirectTo }}
          // Ex.: <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=magiclink&next={{ .RawURL }}">Entrar</a>
          emailRedirectTo: `${origin}/auth/confirm`,
        },
      })
      if (error) throw error
      setMsg('Enviámos um link de acesso para o seu email.')
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao enviar link')
    }
  }

  if (status === 'checking') {
    return <div style={{padding:24, fontFamily:'system-ui'}}>A verificar sessão…</div>
  }

  if (status === 'logged') {
    return (
      <div style={{padding:24, fontFamily:'system-ui'}}>
        <h1 style={{fontSize:20, fontWeight:700, marginBottom:12}}>Sessão ativa encontrada.</h1>
        <div style={{display:'flex', gap:8}}>
          <button
            onClick={() => router.replace('/menu')}
            style={{padding:'10px 14px', border:'1px solid #111', background:'#111', color:'#fff', borderRadius:8}}
          >
            Ir para o menu
          </button>
          <button
            onClick={async () => {
              await supa.auth.signOut()
              setStatus('anon')
            }}
            style={{padding:'10px 14px', border:'1px solid #ddd', background:'#fff', borderRadius:8}}
          >
            Terminar sessão
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Entrar</h1>
      <form onSubmit={sendMagic} style={{ display: 'grid', gap: 8 }}>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
