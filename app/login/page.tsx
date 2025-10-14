'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const supa = createClient()

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    setBusy(true)

    // com templates ajustados, não precisa setar redirectTo aqui
    const { error } = await supa.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // se quiser forçar volta ao menu após login, pode passar um next:
        // emailRedirectTo: `${window.location.origin}/auth/confirm?next=/menu`,
        shouldCreateUser: true,
      },
    })

    setBusy(false)
    if (error) setErr(error.message)
    else setMsg('Enviámos um link de acesso para o seu e-mail.')
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Entrar</h1>
      <form onSubmit={sendMagicLink} style={{ display: 'grid', gap: 8 }}>
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
        <button type="submit" disabled={busy} style={{ padding: '10px 14px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 8 }}>
          {busy ? 'A enviar…' : 'Enviar Magic Link'}
        </button>
      </form>
      {msg && <p style={{ marginTop: 8, color: '#14532d' }}>{msg}</p>}
      {err && <p style={{ marginTop: 8, color: '#7f1d1d' }}>{err}</p>}
    </div>
  )
}
