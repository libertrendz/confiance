'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supa } from '../../lib/supa'

export default function Menu() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) router.replace('/login')
      else setEmail(data.user.email)
    }
    check()
  }, [router])

  async function sair() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Menu</h1>
      <p style={{ marginBottom: 12 }}>Sessão: {email}</p>
      <button onClick={sair} style={{ padding: '8px 12px', background: '#111', color: '#fff', borderRadius: 8 }}>
        Sair
      </button>
    </div>
  )
}
