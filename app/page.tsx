'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) router.replace('/menu')
      else router.replace('/login')
    }
    check()
  }, [router])

  return <div style={{ padding: 24 }}>A verificar sessão…</div>
}
