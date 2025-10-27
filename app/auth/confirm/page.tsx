// app/auth/confirm/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import getBrowserSupabase from '../../../lib/supa'

export default function AuthConfirmPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supa = useMemo(() => getBrowserSupabase(), [])
  const [status, setStatus] = useState('Confirmando login…')

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const code = params.get('code') // supabase v2 envia ?code=... (type=magiclink)
        const next = params.get('next') || '/menu'

        if (!code) {
          setStatus('Link inválido. Voltando ao login…')
          setTimeout(() => router.replace('/login'), 800)
          return
        }

        // Troca o código por sessão e PERSISTE no storage do browser
        const { error } = await supa.auth.exchangeCodeForSession(code)
        if (error) throw error

        if (!cancelled) {
          setStatus('Login confirmado! Redirecionando…')
          setTimeout(() => router.replace(next), 500)
        }
      } catch (e: any) {
        console.error('confirm error:', e)
        if (!cancelled) {
          setStatus('Não foi possível confirmar o login. Redirecionando…')
          setTimeout(() => router.replace('/login'), 1200)
        }
      }
    })()

    return () => { cancelled = true }
  }, [router, params, supa])

  return (
    <div style={{padding:24, fontFamily:'system-ui'}}>
      <h1 style={{fontSize:18, fontWeight:700, marginBottom:8}}>Autenticação</h1>
      <p>{status}</p>
    </div>
  )
}
