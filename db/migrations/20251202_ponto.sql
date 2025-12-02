-- db/migrations/20251202_ponto.sql
BEGIN;

--------------------------------------------------
-- TABELA PRINCIPAL: ponto_registro
--------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ponto_registro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  tipo text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  batida_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

--------------------------------------------------
-- AUDITORIA
--------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ponto_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ponto_id uuid,
  empresa_id uuid,
  usuario_id uuid,
  action text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

--------------------------------------------------
-- FK EMPRESA (GenesysRef exige empresa_id)
--------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'empresas' AND n.nspname='public'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name='ponto_registro'
      AND constraint_name='ponto_registro_empresa_fkey'
    ) THEN
      ALTER TABLE public.ponto_registro
      ADD CONSTRAINT ponto_registro_empresa_fkey
      FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

--------------------------------------------------
-- AUDITORIA TRIGGER (INSERT/UPDATE/DELETE)
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_ponto_audit() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.ponto_audit(ponto_id, empresa_id, usuario_id, action, payload, created_at)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.empresa_id, OLD.empresa_id),
    COALESCE(NEW.usuario_id, OLD.usuario_id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE row_to_json(NEW) END,
    now()
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_ponto_audit') THEN
    CREATE TRIGGER tg_ponto_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.ponto_registro
    FOR EACH ROW EXECUTE FUNCTION public.fn_ponto_audit();
  END IF;
END $$;

--------------------------------------------------
-- RLS COMPLETA (select / insert / update / delete)
--------------------------------------------------

ALTER TABLE public.ponto_registro ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname='ponto_select_empresa') THEN
    CREATE POLICY ponto_select_empresa ON public.ponto_registro
      FOR SELECT
      USING (empresa_id::text = current_setting('request.jwt.claims', true)::jsonb ->> 'empresa_id');
  END IF;

  -- INSERT
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname='ponto_insert_empresa') THEN
    CREATE POLICY ponto_insert_empresa ON public.ponto_registro
      FOR INSERT
      WITH CHECK (empresa_id::text = current_setting('request.jwt.claims', true)::jsonb ->> 'empresa_id');
  END IF;

  -- UPDATE
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname='ponto_update_empresa') THEN
    CREATE POLICY ponto_update_empresa ON public.ponto_registro
      FOR UPDATE
      USING (empresa_id::text = current_setting('request.jwt.claims', true)::jsonb ->> 'empresa_id');
  END IF;

  -- DELETE
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname='ponto_delete_empresa') THEN
    CREATE POLICY ponto_delete_empresa ON public.ponto_registro
      FOR DELETE
      USING (empresa_id::text = current_setting('request.jwt.claims', true)::jsonb ->> 'empresa_id');
  END IF;

END $$;

COMMIT;
