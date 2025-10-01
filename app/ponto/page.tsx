'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function useGeolocation() {
  const [state, setState] = useState<{lat?: number; lon?: number; accuracy?: number; error?: string}>({});
  useEffect(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation não suportada' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setState({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      err => setState({ error: err.message }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);
  return state;
}

export default function PontoPage() {
  const geo = useGeolocation();
  const [foto, setFoto] = useState<File | null>(null);
  const [empresaId, setEmpresaId] = useState('');
  const [funcionarioId, setFuncionarioId] = useState('');

  async function uploadFoto(path: string, file: File) {
    const { data, error } = await supabase.storage.from('pontos-fotos').upload(path, file, { upsert: true });
    if (error) throw error;
    return data?.path;
  }

  async function registrar(tipo: 'entrada'|'pausa'|'retorno'|'saida') {
    const payload: any = {
      p_empresa_id: empresaId,
      p_funcionario_id: funcionarioId,
      p_tipo: tipo,
      p_lat: geo.lat ?? null,
      p_lon: geo.lon ?? null,
      p_accuracy: geo.accuracy ?? null,
      p_foto_path: null,
      p_origem: navigator.onLine ? 'online' : 'offline'
    };

    try {
      if ((tipo === 'entrada' || tipo === 'saida') && !foto) {
        alert('Foto é obrigatória para entrada/saída.');
        return;
      }

      if (navigator.onLine && foto) {
        const path = `${empresaId}/${funcionarioId}/${Date.now()}-${tipo}.jpg`;
        payload.p_foto_path = await uploadFoto(path, foto);
      }

      const { data, error } = await supabase.rpc('ponto_registrar', payload);
      if (error) throw error;
      alert('Ponto registado.');
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-4 mt-6">
      <h1 className="text-2xl font-semibold">Bater Ponto</h1>
      <div className="grid grid-cols-2 gap-2">
        <input className="border p-2 rounded" placeholder="empresa_id" value={empresaId} onChange={e=>setEmpresaId(e.target.value)} />
        <input className="border p-2 rounded" placeholder="funcionario_id" value={funcionarioId} onChange={e=>setFuncionarioId(e.target.value)} />
      </div>

      <div className="text-sm">
        Geo: {geo.lat?.toFixed(5)}, {geo.lon?.toFixed(5)} (±{geo.accuracy ?? '?'}m)
      </div>

      <input type="file" accept="image/*" capture="environment" onChange={(e)=>setFoto(e.target.files?.[0] || null)} />

      <div className="flex gap-2">
        <button className="border rounded px-3 py-2" onClick={()=>registrar('entrada')}>Entrada</button>
        <button className="border rounded px-3 py-2" onClick={()=>registrar('pausa')}>Pausa</button>
        <button className="border rounded px-3 py-2" onClick={()=>registrar('retorno')}>Retorno</button>
        <button className="border rounded px-3 py-2" onClick={()=>registrar('saida')}>Saída</button>
      </div>
    </div>
  );
}
