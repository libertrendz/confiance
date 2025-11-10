async function guardar() {
  try {
    setErr(null);
    const res = await fetch('/api/admin/users/update', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        nome,
        papel,
      }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || 'Falha ao guardar');
    alert('Guardado.');
    window.location.href = '/adm/utilizadores';
  } catch (e: any) {
    setErr(e?.message || 'Falha ao guardar');
  }
}
