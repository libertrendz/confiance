-- db/migrations/2025-11-25_ponto.sql
-- Migration idempotente para módulo PONTO (ponto_registro + ponto_audit)
-- Execute in Supabase SQL Editor or via CI that runs migrations.

-- extensão uuid generator
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) TABELAS
CREATE TABLE IF NOT EXISTS public.ponto_registro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  tipo text NOT NULL, -- ex: 'in' | 'out' | 'break_start' | 'break_end'
  meta jsonb DEFAULT '{}'::jsonb,
  batida_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ponto_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,
  usuario_id uuid,
  action text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2) Foreign keys (safe: create only if referenced tables exist)
DO $$
BEGIN
  IF to_regclass('public.empresas') IS NOT NULL THEN
    ALTER TABLE public.ponto_registro
      ADD CONSTRAINT IF NOT EXISTS ponto_registro_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    ALTER TABLE public.ponto_registro
      ADD CONSTRAINT IF NOT EXISTS ponto_registro_usuario_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

-- 3) Índices
CREATE INDEX IF NOT EXISTS idx_ponto_registro_empresa_batida ON public.ponto_registro (empresa_id, batida_at);
CREATE INDEX IF NOT EXISTS idx_ponto_registro_usuario_batida ON public.ponto_registro (usuario_id, batida_at);

-- 4) RLS: ativar e policies (GenesysRef style, tenant safe)
ALTER TABLE public.ponto_registro ENABLE ROW LEVEL SECURITY;

-- Select: allowed if same empresa OR usuario self
CREATE POLICY IF NOT EXISTS ponto_select_empresa ON public.ponto_registro
  FOR SELECT USING (
    empresa_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'empresa_id')
    OR usuario_id = auth.uid()
  );

-- Insert: authenticated users may insert for themselves (or server via service role)
CREATE POLICY IF NOT EXISTS ponto_insert_self ON public.ponto_registro
  FOR INSERT WITH CHECK (
    (usuario_id = auth.uid() AND empresa_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'empresa_id'))
  );

-- Update: only admins/gestor (via jwt app_role) or service roles – restrict general updates
CREATE POLICY IF NOT EXISTS ponto_update_admin ON public.ponto_registro
  FOR UPDATE USING (
    COALESCE(((current_setting('request.jwt.claims', true)::jsonb ->> 'app_role') = ANY (ARRAY['admin'::text, 'gestor'::text])), false)
  ) WITH CHECK (
    COALESCE(((current_setting('request.jwt.claims', true)::jsonb ->> 'app_role') = ANY (ARRAY['admin'::text, 'gestor'::text])), false)
  );

-- Delete: only admin/gestor
CREATE POLICY IF NOT EXISTS ponto_delete_admin ON public.ponto_registro
  FOR DELETE USING (
    COALESCE(((current_setting('request.jwt.claims', true)::jsonb ->> 'app_role') = ANY (ARRAY['admin'::text, 'gestor'::text])), false)
  );

-- 5) Audit function (simple trigger to write to ponto_audit if you want)
CREATE OR REPLACE FUNCTION public.ponto_audit_insert() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.ponto_audit (empresa_id, usuario_id, action, payload, created_at)
  VALUES (NEW.empresa_id, NEW.usuario_id, TG_OP::text, row_to_json(NEW)::jsonb, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger for insert on ponto_registro (non-blocking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_ponto_registro_audit_ins'
  ) THEN
    CREATE TRIGGER trg_ponto_registro_audit_ins
      AFTER INSERT ON public.ponto_registro
      FOR EACH ROW
      EXECUTE FUNCTION public.ponto_audit_insert();
  END IF;
END;
$$;

-- 6) RPCs: rpc_ponto_bater (idempotente) e rpc_pontos_lista
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
  BEGIN
    v_empresa_id := current_setting('jwt.claims.empresa_id', true)::uuid;
  EXCEPTION WHEN others THEN
    v_empresa_id := NULL;
  END;

  IF v_empresa_id IS NULL THEN v_empresa_id := p_empresa_id; END IF;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id not available in JWT. Pass p_empresa_id for testing.';
  END IF;

  INSERT INTO public.ponto_registro (empresa_id, usuario_id, tipo, meta, batida_at, created_at)
  VALUES (v_empresa_id, p_usuario_id, p_tipo, p_meta, v_batida, now())
  RETURNING id, batida_at INTO v_id, v_batida;

  INSERT INTO public.ponto_audit (empresa_id, usuario_id, action, payload, created_at)
  VALUES (v_empresa_id, p_usuario_id, 'bater', jsonb_build_object('tipo', p_tipo, 'meta', p_meta), now());

  RETURN QUERY SELECT v_id AS id, v_batida AS batida_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.rpc_ponto_bater(uuid,text,jsonb,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_pontos_lista(
  p_usuario_id uuid DEFAULT NULL,
  p_empresa_id uuid DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_limit int DEFAULT 100
)
RETURNS TABLE(id uuid, empresa_id uuid, usuario_id uuid, tipo text, meta jsonb, batida_at timestamptz, created_at timestamptz) AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  BEGIN
    v_empresa_id := current_setting('jwt.claims.empresa_id', true)::uuid;
  EXCEPTION WHEN others THEN
    v_empresa_id := NULL;
  END;

  IF v_empresa_id IS NULL THEN v_empresa_id := p_empresa_id; END IF;

  RETURN QUERY
  SELECT id, empresa_id, usuario_id, tipo, meta, batida_at, created_at
  FROM public.ponto_registro
  WHERE (p_usuario_id IS NULL OR usuario_id = p_usuario_id)
    AND (v_empresa_id IS NULL OR empresa_id = v_empresa_id)
    AND (p_from IS NULL OR batida_at >= p_from)
    AND (p_to IS NULL OR batida_at <= p_to)
  ORDER BY batida_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.rpc_pontos_lista(uuid,uuid,timestamptz,timestamptz,int) TO authenticated;
