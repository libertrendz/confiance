// app/menu/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function MenuPage() {
  const supa = await createClient()
  const { data } = await supa.auth.getUser()
  if (!data?.user) redirect('/login')

  // Carregue dados do menu aqui no servidor se quiser, com o 'supa'
  // const { data: ... } = await supa.from(...)

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1 style={{fontSize:22, fontWeight:700}}>Menu</h1>
        <div>
          <span style={{marginRight:12}}>{data.user.email}</span>
          <a href="/logout">
            <button style={{padding:'8px 12px', border:'1px solid #111', background:'#111', color:'#fff', borderRadius:8}}>
              Sair
            </button>
          </a>
        </div>
      </div>

      <p style={{marginTop:16}}>Conteúdo do menu…</p>
    </div>
  )
}
