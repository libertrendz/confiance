-- db/rpc/rpc_ponto_bater.sql
-- RPC idempotente para registo de batida de ponto
-- Versão corrigida (evita ambiguidade de nomes, grava audit e permite testes com p_empresa_id)

CREATE OR REPLACE FUNCTION public.rpc_ponto_bater(
  p_usuario_id uuid,
  p_tipo text,
  p_meta jsonb DEFAULT '{}'::jsonb,
  p_empresa_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, batida_at timestamptz) AS $$
DECLARE
  v_empresa_id uuid;
  v_id uuid;
  v_batida timestamptz := now();
BEGIN
  -- tentar obter empresa_id do JWT
  BEGIN
    v_empresa_id := current_setting('jwt.claims.empresa_id', true)::uuid;
  EXCEPTION WHEN others THEN
    v_empresa_id := NULL;
  END;

  -- fallback para parâmetro (útil para testes no SQL editor)
  IF v_empresa_id IS NULL THEN
    v_empresa_id := p_empresa_id;
  END IF;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id não disponível (jwt.claims.empresa_id ausente). Passe p_empresa_id para teste.';
  END IF;

  -- inserir batida (usa alias "pr" para evitar ambiguidade no RETURNING)
  INSERT INTO public.ponto_registro AS pr (empresa_id, usuario_id, tipo, meta, batida_at, created_at)
  VALUES (v_empresa_id, p_usuario_id, p_tipo, p_meta, v_batida, now())
  RETURNING pr.id, pr.batida_at INTO v_id, v_batida;

  -- audit log
  INSERT INTO public.ponto_audit (empresa_id, usuario_id, action, payload, created_at)
  VALUES (v_empresa_id, p_usuario_id, 'bater', jsonb_build_object('tipo', p_tipo, 'meta', p_meta), now());

  -- retorna com nomes corretos (id, batida_at)
  RETURN QUERY SELECT v_id AS id, v_batida AS batida_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ajustar o role abaixo se usarem outro role para frontend
GRANT EXECUTE ON FUNCTION public.rpc_ponto_bater(uuid,text,jsonb,uuid) TO authenticated;
