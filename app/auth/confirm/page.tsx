'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import getBrowserSupabase from '@/lib/supa'

export default function AuthConfirmPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supa = useMemo(() => getBrowserSupabase(), [])

  const [msg, setMsg] = useState('A confirmar o login…')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token_hash = params.get('token_hash')
        const type = params.get('type') // deve vir "magiclink"
        const next = params.get('next') || '/menu'

        if (token_hash && type) {
          // Fluxo oficial de Magic Link no supabase-js v2
          const { error } = await supa.auth.verifyOtp({ type: 'magiclink', token_hash })
          if (error) throw error
          if (!cancelled) {
            setMsg('Login confirmado! Redirecionando…')
            router.replace(next)
            return
          }
        } else {
          // fallback: se já houver sessão, segue; senão manda para login
          const { data } = await supa.auth.getUser()
          if (data.user) {
            router.replace(next || '/menu')
            return
          }
          setMsg('Link inválido ou expirado. Voltando ao login…')
          setTimeout(() => router.replace('/login'), 800)
        }
      } catch (e: any) {
        setMsg('Não foi possível confirmar o login. Redirecionando…')
        setTimeout(() => router.replace('/login'), 800)
      }
    })()
    return () => { cancelled = true }
  }, [params, router, supa])

  return (
    <div style={{padding:24, fontFamily:'system-ui'}}>
      {msg}
    </div>
  )
}
