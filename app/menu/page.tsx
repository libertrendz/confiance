// app/menu/page.tsx
'use client';

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supa } from '../../lib/supa'

export default function MenuPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supa.auth.getUser()
      if (!data.user) {
        router.replace('/login?next=/menu')
      } else {
        setEmail(data.user.email ?? null)
      }
      setLoading(false)
    })()
  }, [router])

  async function sair() {
    await supa.auth.signOut()
    router.replace('/login')
  }

  if (loading) return <div style={{padding:24}}>A carregar…</div>

  return (
    <div style={{ maxWidth: 920, margin:'0 auto', padding:24, fontFamily:'system-ui' }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1 style={{fontSize:22, fontWeight:700}}>Menu</h1>
        <div>
          <span style={{marginRight:12}}>{email}</span>
          <button onClick={sair} style={{padding:'8px 12px', border:'1px solid #111', background:'#111', color:'#fff', borderRadius:8}}>Sair</button>
        </div>
      </div>

      <p style={{marginTop:12}}>👏 Autenticado e carregando o restante do app…</p>
    </div>
  )
}
