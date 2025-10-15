'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supa } from '../../lib/supa'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    // Se vier com token no hash, processa login
    const hash = window.location.hash
    if (hash.includes('access_token')) {
      supabase.auth.getSessionFromUrl({ storeSession: true }).then(({ error }) => {
        if (error) {
          setErr(error.message)
        } else {
          router.replace('/menu')
        }
      })
    }
  }, [router])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/login`, // redireciona pra cá pra processar hash
      },
    })

    if (error) setErr(error.message)
    else setMsg('Link mágico enviado para o seu e-mail.')
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Entrar</h1>

      <form onSubmit={enviar} style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        <input
          type="email"
          required
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
        />
        <button
          type="submit"
          style={{ padding: '10px 14px', background: '#111', color: '#fff', borderRadius: 8 }}
        >
          Enviar Magic Link
        </button>
      </form>

      {msg && <p style={{ color: '#14532d', marginTop: 8 }}>{msg}</p>}
      {err && <p style={{ color: '#7f1d1d', marginTop: 8 }}>{err}</p>}
    </div>
  )
}
