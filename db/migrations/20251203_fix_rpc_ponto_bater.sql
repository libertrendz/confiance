-- db/migrations/20251203_fix_rpc_ponto_bater.sql
BEGIN;

-- 1) Remover overloads antigos / conflitantes de rpc_ponto_bater
--    (seguros, idempotentes: se não existirem, não quebram)

DROP FUNCTION IF EXISTS public.rpc_ponto_bater(uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.rpc_ponto_bater(uuid, text, jsonb, uuid);

-- 2) Criar/forçar a VERSÃO OFICIAL do RPC
-- Assinatura única:
--   rpc_ponto_bater(p_empresa_id uuid,
--                   p_usuario_id uuid,
--                   p_tipo       text,
--                   p_meta       jsonb DEFAULT '{}'::jsonb)

CREATE OR REPLACE FUNCTION public.rpc_ponto_bater(
  p_empresa_id uuid,
  p_usuario_id uuid,
  p_tipo       text,
  p_meta       jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(id uuid, batida_at timestamptz)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_id     uuid;
  v_batida timestamptz;
BEGIN
  INSERT INTO public.ponto_registro (
    empresa_id,
    usuario_id,
    tipo,
    meta,
    batida_at,
    created_at
  )
  VALUES (
    p_empresa_id,
    p_usuario_id,
    p_tipo,
    COALESCE(p_meta, '{}'::jsonb),
    now(),
    now()
  )
  RETURNING id, batida_at
  INTO v_id, v_batida;

  RETURN QUERY
  SELECT v_id, v_batida;
END;
$$;

-- 3) Garantir permissão para authenticated (caso usemos direto no app)
GRANT EXECUTE ON FUNCTION public.rpc_ponto_bater(uuid, uuid, text, jsonb) TO authenticated;

COMMIT;
