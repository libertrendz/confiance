// app/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  const supa = await createClient()
  const { data } = await supa.auth.getUser()

  if (data?.user) redirect('/menu')
  redirect('/login')
}
