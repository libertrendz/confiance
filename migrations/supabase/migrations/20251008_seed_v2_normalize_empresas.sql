-- 1) Deduplicar empresas por nome (mantém a mais antiga)
WITH dups AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY LOWER(nome) ORDER BY id) AS rn
  FROM public.empresas
)
DELETE FROM public.empresas e
USING dups d
WHERE e.id = d.id
  AND d.rn > 1;

-- 2) Garantir a empresa Confiance com UUID fixo
INSERT INTO public.empresas (id, nome)
VALUES ('f82c84b2-cff3-4526-99af-94de4b0878dc', 'Confiance')
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

-- 3) Criar índice único para impedir novas duplicatas por nome
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'empresas_nome_key'
  ) THEN
    ALTER TABLE public.empresas
    ADD CONSTRAINT empresas_nome_key UNIQUE (nome);
  END IF;
END $$;
