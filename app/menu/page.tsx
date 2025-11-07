<header
  style={{
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
    rowGap: 8,
  }}
>
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180 }}>
    <img src="/logo-confiance.png" alt="CONFIANCE" style={{ height: 40, width: 'auto' }} />
    <span style={{ fontWeight: 800, letterSpacing: 0.3, color: '#0e3258', fontSize: 18 }}>
      CONFIANCE
    </span>
  </div>

  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
    }}
  >
    <span
      style={{
        fontSize: 12,
        background: '#EEF3FF',
        color: '#0e3258',
        padding: '4px 8px',
        borderRadius: 999,
        border: '1px solid #D7E3FF',
        fontWeight: 600,
      }}
    >
      {role.toUpperCase()}
    </span>
    <span style={{ fontSize: 13, color: '#555' }}>{email ?? '—'}</span>
    <button
      onClick={sair}
      style={{
        padding: '8px 12px',
        borderRadius: 10,
        border: '1px solid #ddd',
        background: '#fff',
        cursor: 'pointer',
        fontWeight: 500,
      }}
    >
      Sair
    </button>
  </div>
</header>
