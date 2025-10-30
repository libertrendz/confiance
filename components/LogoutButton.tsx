// components/LogoutButton.tsx
'use client';
import getBrowserSupabase from '@/lib/supa';

export default function LogoutButton() {
  const sair = async () => {
    const supa = getBrowserSupabase();
    await supa.auth.signOut();
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-'))
      .forEach((k) => localStorage.removeItem(k));
    window.location.replace('/login');
  };
  return <button onClick={sair}>Terminar sessão</button>;
}
