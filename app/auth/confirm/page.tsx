// app/auth/confirm/page.tsx
'use client';

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supa } from '../../../lib/supa'

export default function AuthConfirmPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Confirmando login…')

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        // Lê os params direto do window para evitar warnings de Suspense
        const params = new URLSearchParams(window.location.search)
        const token_hash = params.get('token_hash')
        const type = (params.get('type') ?? '').toLowerCase()
        const code = params.get('code')
        const next = params.get('next') || '/menu'

        // 1) Magic Link (GoTrue v2): vem com token_hash + type (magiclink, signup, etc.)
        if (token_hash) {
          const { error } = await supa.auth.verifyOtp({ type: 'magiclink', token_hash })
          if (error) throw error
          if (!cancelled) {
            setStatus('Login confirmado! Redirecionando…')
            router.replace(next)
          }
          return
        }

        // 2) Fluxo OAuth/PKCE (às vezes o email template também usa code):
        if (code) {
          const { error } = await supa.auth.exchangeCodeForSession(code)
          if (error) throw error
          if (!cancelled) {
            setStatus('Login confirmado! Redirecionando…')
            router.replace(next)
          }
          return
        }

        // 3) Sem token/código? volta pro login
        if (!cancelled) {
          setStatus('Link inválido ou expirado. Voltando ao login…')
          setTimeout(() => router.replace('/login'), 900)
        }
      } catch (e: any) {
        console.error('AuthConfirm error:', e)
        if (!cancelled) {
          setStatus('Não foi possível confirmar o login. Voltando ao login…')
          setTimeout(() => router.replace('/login'), 1200)
        }
      }
    })()

    return () => { cancelled = true }
  }, [router])

  return (
    <div style={{padding:24, fontFamily:'system-ui', maxWidth:560, margin:'0 auto'}}>
      <h1 style={{fontSize:20, fontWeight:700, marginBottom:8}}>Autenticação</h1>
      <p>{status}</p>
    </div>
  )
}
