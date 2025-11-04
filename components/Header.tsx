// components/Header.tsx
'use client';

type HeaderProps = {
  email?: string | null;
};

export default function Header({ email }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <img
          src="/logo-confiance.png"
          alt="CONFIANCE"
          className="brand-logo"
          // Se quiser tamanho fixo aqui, descomenta a linha abaixo e ajusta:
          // style={{ height: 54 }}
        />
      </div>

      <div className="user">
        {email ? <span className="user-email">{email}</span> : <span className="user-email">—</span>}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => (window.location.href = '/auth/signout')}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
