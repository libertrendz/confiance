'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState('');

  async function signIn() {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) alert(error.message);
    else alert('Verifique o seu e-mail para entrar.');
  }

  return (
    <div className="space-y-3 mt-12">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <input
        className="border rounded p-2 w-full"
        placeholder="email@exemplo.com"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
      />
      <button onClick={signIn} className="rounded px-4 py-2 border">
        Enviar Magic Link
      </button>
    </div>
  );
}
