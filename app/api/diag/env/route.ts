import { NextResponse } from 'next/server';

export async function GET() {
  const flags = {
    SUPABASE_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY, // legado
    SERVICE_ROLE: !!process.env.SERVICE_ROLE,                           // legado
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    CONF_EMPRESA_ID: !!process.env.CONF_EMPRESA_ID,
  };
  return NextResponse.json(flags);
}
