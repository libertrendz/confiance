// app/adm/locais/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supa';

type LocalRow = {
  id: string;
  empresa_id: string;
  nome: string | null;
  lat: number | null;
  lng: number | null;
  radius_m: number | null;
  ativo: boolean | null;
  created_at: string;
};

type GeocodeResult = { display_name: string; lat: number; lng: number };

export default function AdmLocaisPage() {
  const supa = useMemo(() => getBrowserSupabase(), []);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);

  const [rows, setRows] = useState<LocalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);

  // Campo “endereço” é só para buscar coordenadas (não precisa existir no DB)
  const [endereco, setEndereco] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoResults, setGeoResults] = useState<GeocodeResult[]>([]);

  const [form, setForm] = useState<{
    nome: string;
    lat: string;
    lng: string;
    radius_m: string;
    ativo: boolean;
  }>({
    nome: '',
    lat: '',
    lng: '',
    radius_m: '100',
    ativo: true,
  });

  async function carregarEmpresaDoAdmin() {
    setLoadingEmpresa(true);
    setErr(null);
    try {
      const { data: ud, error: userErr } = await supa.auth.getUser();
      if (userErr) throw userErr;

      const uid = ud.user?.id ?? null;
      if (!uid) throw new Error('Sessão expirada. Faça login novamente.');

      const { data: prof, error: profErr } = await supa
        .from('profiles')
        .select('empresa_id')
        .eq('user_id', uid)
        .maybeSingle();

      if (profErr) throw profErr;

      const eid = prof?.empresa_id ?? null;
      if (!eid) throw new Error('Perfil sem empresa_id. Contacte o administrador do sistema.');

      setEmpresaId(eid);
    } catch (e: any) {
      console.error('Erro ao carregar empresa do admin', e);
      setEmpresaId(null);
      setErr(e?.message || 'Falha ao carregar empresa do utilizador.');
    } finally {
      setLoadingEmpresa(false);
    }
  }

  async function loadLista(eid: string) {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supa
        .from('locais_permitidos')
        .select('id, empresa_id, nome, lat, lng, radius_m, ativo, created_at')
        .eq('empresa_id', eid)
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) throw error;
      setRows((data as LocalRow[]) || []);
    } catch (e: any) {
      console.error('Erro ao carregar locais_permitidos', e);
      setErr(e?.message || 'Falha ao carregar locais.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditId(null);
    setEndereco('');
    setGeoResults([]);
    setForm({
      nome: '',
      lat: '',
      lng: '',
      radius_m: '100',
      ativo: true,
    });
  }

  function preencherParaEditar(r: LocalRow) {
    setEditId(r.id);
    setEndereco('');
    setGeoResults([]);
    setForm({
      nome: r.nome || '',
      lat: r.lat == null ? '' : String(r.lat),
      lng: r.lng == null ? '' : String(r.lng),
      radius_m: r.radius_m == null ? '100' : String(r.radius_m),
      ativo: r.ativo !== false,
    });
  }

  async function buscarCoordenadas() {
    const q = endereco.trim();
    if (!q) {
      setErr('Informe um endereço para buscar coordenadas.');
      return;
    }

    setGeoLoading(true);
    setErr(null);
    setMsg(null);
    setGeoResults([]);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { method: 'GET' });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Falha ao buscar coordenadas.');
      }

      const list = (json.results || []) as GeocodeResult[];
      setGeoResults(list);

      if (list.length === 1) {
        setForm((f) => ({ ...f, lat: String(list[0].lat), lng: String(list[0].lng) }));
      }
      if (!list.length) setMsg('Nenhum resultado encontrado. Tente um endereço mais completo.');
    } catch (e: any) {
      setErr(e?.message || 'Falha ao buscar coordenadas.');
    } finally {
      setGeoLoading(false);
    }
  }

  function aplicarResultado(r: GeocodeResult) {
    setForm((f) => ({ ...f, lat: String(r.lat), lng: String(r.lng) }));
    setGeoResults([]);
    setMsg('Coordenadas preenchidas. Agora é só gravar o local.');
  }

  async function salvarLocal(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!empresaId) {
      setErr('Empresa não carregada. Recarregue a página.');
      return;
    }

    const nome = form.nome.trim();
    if (!nome) {
      setErr('Informe um nome para o local.');
      return;
    }

    const latNum = form.lat.trim() ? Number(form.lat) : NaN;
    const lngNum = form.lng.trim() ? Number(form.lng) : NaN;
    const radNum = form.radius_m.trim() ? Number(form.radius_m) : NaN;

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setErr('Preencha lat e lng (use “Buscar coordenadas” ou digite manualmente).');
      return;
    }
    if (!Number.isFinite(radNum) || radNum <= 0) {
      setErr('Informe um raio válido (metros).');
      return;
    }

    const payload: any = {
      empresa_id: empresaId,
      nome,
      lat: latNum,
      lng: lngNum,
      radius_m: Math.round(radNum),
      ativo: !!form.ativo,
    };

    try {
      if (editId) {
        const { error } = await supa
          .from('locais_permitidos')
          .update(payload)
          .eq('id', editId)
          .eq('empresa_id', empresaId);

        if (error) throw error;
        setMsg('Local atualizado com sucesso.');
      } else {
        const { error } = await supa.from('locais_permitidos').insert(payload);
        if (error) throw error;
        setMsg('Local criado com sucesso.');
      }

      await loadLista(empresaId);
      resetForm();
    } catch (e: any) {
      console.error('Erro ao salvar local', e);
      setErr(e?.message || 'Falha ao salvar local.');
    }
  }

  async function excluirLocal(id: string) {
    if (!empresaId) return;
    const ok = window.confirm('Tem certeza que deseja excluir este local?');
    if (!ok) return;

    setErr(null);
    setMsg(null);

    try {
      const { error } = await supa
        .from('locais_permitidos')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresaId);

      if (error) throw error;

      setMsg('Local excluído.');
      await loadLista(empresaId);
      if (editId === id) resetForm();
    } catch (e: any) {
      console.error('Erro ao excluir local', e);
      setErr(e?.message || 'Falha ao excluir local.');
    }
  }

  async function recarregarTudo() {
    setMsg(null);
    setErr(null);
    if (!empresaId) {
      await carregarEmpresaDoAdmin();
      return;
    }
    await loadLista(empresaId);
  }

  useEffect(() => {
    carregarEmpresaDoAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (empresaId) loadLista(empresaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  return (
    <main style={{ padding: 18 }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          gap: 12,
        }}
      >
        <div>
          <h1 className="h1" style={{ marginBottom: 4 }}>
            Locais permitidos
          </h1>
          <div className="muted" style={{ fontSize: 12 }}>
            {loadingEmpresa
              ? 'A carregar empresa…'
              : empresaId
              ? `Empresa: ${empresaId.slice(0, 8)}…`
              : 'Empresa não carregada'}
          </div>
        </div>

       <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
  <a
    href="/adm/roteiros"
    className="btn btn-ghost"
    style={{
      textDecoration: 'none',
      background: '#FFD24D',
      color: '#0e3258',
      border: 'none',
      fontWeight: 500,
    }}
  >
    ← Roteiros
  </a>

  <button className="btn btn-ghost" onClick={recarregarTudo} disabled={loading || loadingEmpresa}>
    {loading || loadingEmpresa ? 'A carregar…' : 'Recarregar'}
  </button>
</div>
</header>

      {/* FORM */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="h2" style={{ marginTop: 0, marginBottom: 8 }}>
          {editId ? 'Editar local' : 'Novo local'}
        </h2>

        <p className="muted" style={{ marginTop: 0, marginBottom: 14 }}>
          Dica: digite o endereço, clique em <strong>Buscar coordenadas</strong> e escolha um resultado.
          Depois ajuste o raio (metros) e salve.
        </p>

        <form
          onSubmit={salvarLocal}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <label className="muted" htmlFor="local-nome">
              Nome do local
            </label>
            <input
              id="local-nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              style={inputStyle}
              placeholder="Ex.: Obra Centro"
              disabled={!empresaId || loadingEmpresa}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="muted" htmlFor="local-endereco">
              Endereço (para buscar coordenadas)
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                id="local-endereco"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Rua, nº, cidade, país"
                disabled={!empresaId || loadingEmpresa}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={buscarCoordenadas}
                disabled={!empresaId || loadingEmpresa || geoLoading}
                style={{ whiteSpace: 'nowrap' }}
              >
                {geoLoading ? 'Buscando…' : 'Buscar coordenadas'}
              </button>
            </div>

            {!!geoResults.length && (
              <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                {geoResults.map((r, i) => (
                  <button
                    key={r.display_name + i}
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => aplicarResultado(r)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: '#0e3258', fontSize: 13 }}>
                      {r.lat.toFixed(6)}, {r.lng.toFixed(6)}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {r.display_name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="muted" htmlFor="local-lat">
              Latitude
            </label>
            <input
              id="local-lat"
              value={form.lat}
              onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
              style={inputStyle}
              placeholder="40.123456"
              disabled={!empresaId || loadingEmpresa}
            />
          </div>

          <div>
            <label className="muted" htmlFor="local-lng">
              Longitude
            </label>
            <input
              id="local-lng"
              value={form.lng}
              onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
              style={inputStyle}
              placeholder="-8.123456"
              disabled={!empresaId || loadingEmpresa}
            />
          </div>

          <div>
            <label className="muted" htmlFor="local-radius">
              Raio (metros)
            </label>
            <input
              id="local-radius"
              value={form.radius_m}
              onChange={(e) => setForm((f) => ({ ...f, radius_m: e.target.value }))}
              style={inputStyle}
              placeholder="100"
              disabled={!empresaId || loadingEmpresa}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 22 }}>
            <input
              id="local-ativo"
              type="checkbox"
              checked={!!form.ativo}
              onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
              disabled={!empresaId || loadingEmpresa}
            />
            <label htmlFor="local-ativo" style={{ fontSize: 13 }}>
              Ativo
            </label>
          </div>

          {err && (
            <p style={{ color: 'crimson', gridColumn: '1 / -1', margin: 0 }}>
              {err}
            </p>
          )}
          {msg && (
            <p style={{ color: 'green', gridColumn: '1 / -1', margin: 0 }}>
              {msg}
            </p>
          )}

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {editId && (
              <button type="button" className="btn btn-ghost" onClick={resetForm}>
                Cancelar
              </button>
            )}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!empresaId || loadingEmpresa}
            >
              {editId ? 'Salvar alterações' : 'Criar local'}
            </button>
          </div>
        </form>
      </section>

      {/* LISTA */}
      <section className="card">
        <h2 className="h2" style={{ marginTop: 0, marginBottom: 8 }}>
          Locais cadastrados
        </h2>

        {!rows.length && !loading && <p className="muted">Sem locais cadastrados.</p>}

        {!!rows.length && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Nome</th>
                  <th style={{ padding: 8 }}>Lat/Lng</th>
                  <th style={{ padding: 8 }}>Raio</th>
                  <th style={{ padding: 8 }}>Ativo</th>
                  <th style={{ padding: 8 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>
                      <div style={{ fontWeight: 800, color: '#0e3258' }}>{r.nome || '—'}</div>
                      <div className="muted" style={{ fontSize: 11 }}>
                        {r.id.slice(0, 8)}…
                      </div>
                    </td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>
                      {r.lat == null || r.lng == null ? '—' : `${r.lat}, ${r.lng}`}
                    </td>
                    <td style={{ padding: 8 }}>{r.radius_m ?? '—'} m</td>
                    <td style={{ padding: 8 }}>{r.ativo === false ? 'Não' : 'Sim'}</td>
                    <td style={{ padding: 8 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost" type="button" onClick={() => preencherParaEditar(r)}>
                          Editar
                        </button>
                        <button className="btn btn-ghost" type="button" onClick={() => excluirLocal(r.id)}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loading && <p className="muted" style={{ marginTop: 8 }}>A carregar locais…</p>}
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: '#fff',
};
