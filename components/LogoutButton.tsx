'use client';

export default function LogoutButton() {
  return (
    <button onClick={() => (window.location.href = '/auth/signout')}>
      Terminar sessão
    </button>
  );
}
