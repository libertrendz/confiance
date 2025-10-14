// app/logout/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supa = await createClient()
  await supa.auth.signOut()
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'https://confiance-ffoz.vercel.app'))
}
