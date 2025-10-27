// app/menu/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import getBrowserSupabase from '@/lib/supa'

export default function MenuPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supa = useMemo(() => getBrowserSupabase(), [])
  const [email, setEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supa.auth.getUser()
      if (!data.user) {
        setChecking(false)
        return
      }
      setEmail(data.user.email ?? null)
      setChecking(false)
    })()
  }, [supa])

  async function sair() {
    await supa.auth.signOut()
    router.replace('/login')
  }

  if (checking) return <div style={{padding:24}}>A verificar sessão…</div>

  if (!email) {
    // Sem sessão: NÃO redireciona em loop — mostra CTA.
    const next = encodeURIComponent('/menu')
    return (
      <div style={{padding:24, fontFamily:'system-ui'}}>
        <p>Você não está autenticado.</p>
        <a href={`/login?next=${next}`} style={{textDecoration:'none'}}>
          <button style={{padding:'8px 12px', border:'1px solid #111', background:'#111', color:'#fff', borderRadius:8}}>
            Ir para o login
          </button>
        </a>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 920, margin:'0 auto', padding:24, fontFamily:'system-ui' }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1 style={{fontSize:22, fontWeight:700}}>Menu</h1>
        <div>
          <span style={{marginRight:12}}>{email}</span>
          <button onClick={sair} style={{padding:'8px 12px', border:'1px solid #111', background:'#111', color:'#fff', borderRadius:8}}>Sair</button>
        </div>
      </div>

      <div style={{marginTop:16, padding:16, border:'1px solid #eee', borderRadius:12}}>
        <h2 style={{fontSize:18, fontWeight:700, marginBottom:8}}>Bem-vindo ao Confiance</h2>
        <p>Escolha uma opção no menu.</p>
      </div>
    </div>
  )
}
