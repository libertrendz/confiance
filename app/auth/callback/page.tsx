// app/auth/callback/page.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBrowserSupabase } from '../../../lib/supa';

export default function CallbackPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const [status, setStatus] = useState('A confirmar o login…')

  const next = useMemo(() => decodeURIComponent(sp.get('next') || '/menu'), [sp])
  const code = sp.get('code')

  useEffect(() => {
    (async () => {
      try {
        if (code) {
          // Fluxo PKCE/OAuth
          const { error } = await supa.auth.exchangeCodeForSession(code)
          if (error) throw error
          setStatus('Login confirmado! Redirecionando…')
          router.replace(next)
          return
        }

        // Fluxo Magic Link: vem no hash (#access_token=...)
        const hash = typeof window !== 'undefined' ? window.location.hash : ''
        const params = new URLSearchParams(hash.replace(/^#/, ''))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')

        if (access_token && refresh_token) {
          const { error } = await supa.auth.setSession({ access_token, refresh_token })
          if (error) throw error
          setStatus('Login confirmado! Redirecionando…')
          router.replace(next)
          return
        }

        // Se não veio nada utilizável, volta ao login
        setStatus('Não foi possível confirmar o login. Redirecionando…')
        router.replace('/login')
      } catch (e) {
        setStatus('Falha ao confirmar o login. Redirecionando…')
        router.replace('/login')
      }
    })()
  }, [code, next, router])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>Autenticando…</h1>
      <p>{status}</p>
    </div>
  )
}
