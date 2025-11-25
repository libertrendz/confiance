-- db/migrations/001_create_ponto_registro.sql
-- Migration idempotente: cria ponto_registro + ponto_audit + view_resumo
-- Safe: uses IF NOT EXISTS; avoid NOT NULL until backfill done.

BEGIN;

-- create extension if not exists (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ponto_registro
CREATE TABLE IF NOT EXISTS public.ponto_registro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,
  usuario_id uuid,
  batida_at timestamptz,              -- obrigar NOT NULL via backfill se necessário
  tipo text,                          -- 'in' / 'out' / outros
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- audit table for point actions
CREATE TABLE IF NOT EXISTS public.ponto_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,
  usuario_id uuid,
  action text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- indexes
CREATE INDEX IF NOT EXISTS idx_ponto_empresa_usuario ON public.ponto_registro (empresa_id, usuario_id, batida_at);
CREATE INDEX IF NOT EXISTS idx_ponto_empresa_batida ON public.ponto_registro (empresa_id, batida_at);
CREATE INDEX IF NOT EXISTS idx_ponto_audit_empresa ON public.ponto_audit (empresa_id, created_at);

-- view resumo (read-only convenience)
CREATE OR REPLACE VIEW public.view_ponto_resumo AS
SELECT
  pr.id,
  pr.empresa_id,
  pr.usuario_id,
  pr.batida_at,
  pr.tipo,
  pr.meta,
  pr.created_at
FROM public.ponto_registro pr;

COMMIT;
