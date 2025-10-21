// app/api/flags/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data, error } = await supa.from('feature_flags').select('key,enabled')
  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data ?? [])
}
