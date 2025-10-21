'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supa'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/menu'

  async function enviarMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setMsg('Enviando link...')
    const supa = getBrowserSupabase()

    const { error } = await supa.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=${next}` },
    })

    if (error) {
      setMsg('Erro: ' + error.message)
    } else {
      setMsg('Link enviado! Verifique seu e-mail.')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1>Entrar</h1>
      <form onSubmit={enviarMagicLink}>
        <input
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 8, marginTop: 8, borderRadius: 8, border: '1px solid #ddd' }}
        />
        <button type="submit" style={{ marginTop: 12, padding: 8, width: '100%' }}>
          Enviar Magic Link
        </button>
      </form>
      {msg && <p style={{ marginTop: 16 }}>{msg}</p>}
    </div>
  )
}
