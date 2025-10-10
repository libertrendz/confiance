-- Patch v3: adiciona projeto_id em orcamentos (se não existir) + upsert do seed v3
DO $$
DECLARE
  v_empresa_id  uuid := 'f82c84b2-cff3-4526-99af-94de4b0878dc'; -- Confiance
  v_projeto_id  uuid := 'a1111111-1111-1111-1111-111111111001';
  v_fase1_id    uuid := 'a1111111-1111-1111-1111-111111111101';
  v_fase2_id    uuid := 'a1111111-1111-1111-1111-111111111102';
  v_fase3_id    uuid := 'a1111111-1111-1111-1111-111111111103';
  v_orc_id      uuid := 'b2222222-2222-2222-2222-222222222001';
  v_item1_id    uuid := 'c3333333-3333-3333-3333-333333333101';
  v_item2_id    uuid := 'c3333333-3333-3333-3333-333333333102';
  v_item3_id    uuid := 'c3333333-3333-3333-3333-333333333103';
BEGIN
  -- 1) Garantir a coluna projeto_id em public.orcamentos
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='orcamentos') THEN

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='orcamentos' AND column_name='projeto_id'
    ) THEN
      ALTER TABLE public.orcamentos ADD COLUMN projeto_id uuid;
    END IF;

    -- FK (só cria se ainda não existir)
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema='public'
        AND tc.table_name='orcamentos'
        AND tc.constraint_type='FOREIGN KEY'
        AND tc.constraint_name='orcamentos_projeto_id_fkey'
    ) THEN
      ALTER TABLE public.orcamentos
        ADD CONSTRAINT orcamentos_projeto_id_fkey
        FOREIGN KEY (projeto_id) REFERENCES public.projetos(id) ON DELETE CASCADE;
    END IF;

    -- Index auxiliar
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='idx_orcamentos_projeto_id'
    ) THEN
      CREATE INDEX idx_orcamentos_projeto_id ON public.orcamentos(projeto_id);
    END IF;
  END IF;

  -- 2) Seed mínimo (empresa, projeto, fases, orçamento e itens) — tudo idempotente

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='empresas') THEN
    INSERT INTO public.empresas (id, nome)
    VALUES (v_empresa_id, 'Confiance')
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='projetos') THEN
    -- Ajuste colunas conforme teu schema: se não existir "status", remova-a daqui
    BEGIN
      INSERT INTO public.projetos (id, empresa_id, nome, status)
      VALUES (v_projeto_id, v_empresa_id, 'Obra A', 'ativo');
    EXCEPTION WHEN undefined_column THEN
      -- Sem coluna status? Faz sem ela:
      INSERT INTO public.projetos (id, empresa_id, nome)
      VALUES (v_projeto_id, v_empresa_id, 'Obra A')
      ON CONFLICT (id) DO UPDATE SET empresa_id=EXCLUDED.empresa_id, nome=EXCLUDED.nome;
    END;

    -- Se a de cima não deu exceção, garante upsert:
    INSERT INTO public.projetos (id, empresa_id, nome)
    VALUES (v_projeto_id, v_empresa_id, 'Obra A')
    ON CONFLICT (id) DO UPDATE SET empresa_id=EXCLUDED.empresa_id, nome=EXCLUDED.nome;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fases') THEN
    -- Ajuste colunas conforme teu schema (ordem, status). Se não existirem, remova.
    BEGIN
      INSERT INTO public.fases (id, projeto_id, nome, ordem, status) VALUES
        (v_fase1_id, v_projeto_id, 'Fase 1', 1, 'planeada'),
        (v_fase2_id, v_projeto_id, 'Fase 2', 2, 'planeada'),
        (v_fase3_id, v_projeto_id, 'Fase 3', 3, 'planeada')
      ON CONFLICT (id) DO UPDATE SET projeto_id=EXCLUDED.projeto_id, nome=EXCLUDED.nome, ordem=EXCLUDED.ordem, status=EXCLUDED.status;
    EXCEPTION WHEN undefined_column THEN
      INSERT INTO public.fases (id, projeto_id, nome) VALUES
        (v_fase1_id, v_projeto_id, 'Fase 1'),
        (v_fase2_id, v_projeto_id, 'Fase 2'),
        (v_fase3_id, v_projeto_id, 'Fase 3')
      ON CONFLICT (id) DO UPDATE SET projeto_id=EXCLUDED.projeto_id, nome=EXCLUDED.nome;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orcamentos') THEN
    -- Upsert do orçamento principal (com projeto_id agora existente)
    BEGIN
      INSERT INTO public.orcamentos (id, projeto_id, nome, tipo, moeda, status)
      VALUES (v_orc_id, v_projeto_id, 'Orçamento Principal', 'PRINCIPAL', 'EUR', 'ativo')
      ON CONFLICT (id) DO UPDATE
        SET projeto_id=EXCLUDED.projeto_id, nome=EXCLUDED.nome, tipo=EXCLUDED.tipo, moeda=EXCLUDED.moeda, status=EXCLUDED.status;
    EXCEPTION WHEN undefined_column THEN
      -- Se não existirem essas colunas no teu schema, faz o mínimo (id, projeto_id, nome)
      INSERT INTO public.orcamentos (id, projeto_id, nome)
      VALUES (v_orc_id, v_projeto_id, 'Orçamento Principal')
      ON CONFLICT (id) DO UPDATE
        SET projeto_id=EXCLUDED.projeto_id, nome=EXCLUDED.nome;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orcamentos_itens') THEN
    -- Ajusta colunas conforme teu schema (categoria, descricao, quantidade, preco_unitario, fase_id)
    BEGIN
      INSERT INTO public.orcamentos_itens (id, orcamento_id, fase_id, categoria, descricao, quantidade, preco_unitario) VALUES
        (v_item1_id, v_orc_id, v_fase1_id, 'Materiais', 'Cimento CP II',    100, 5.50),
        (v_item2_id, v_orc_id, v_fase2_id, 'Mão de obra','Alvenaria bloco',  80,  12.00),
        (v_item3_id, v_orc_id, v_fase3_id, 'Serviços',  'Impermeabilização', 10,  150.00)
      ON CONFLICT (id) DO UPDATE
        SET orcamento_id=EXCLUDED.orcamento_id, fase_id=EXCLUDED.fase_id, categoria=EXCLUDED.categoria,
            descricao=EXCLUDED.descricao, quantidade=EXCLUDED.quantidade, preco_unitario=EXCLUDED.preco_unitario;
    EXCEPTION WHEN undefined_column THEN
      -- fallback mínimo, caso falte alguma coluna
      INSERT INTO public.orcamentos_itens (id, orcamento_id, fase_id, descricao, quantidade, preco_unitario) VALUES
        (v_item1_id, v_orc_id, v_fase1_id, 'Cimento CP II',    100, 5.50),
        (v_item2_id, v_orc_id, v_fase2_id, 'Alvenaria bloco',   80, 12.00),
        (v_item3_id, v_orc_id, v_fase3_id, 'Impermeabilização', 10, 150.00)
      ON CONFLICT (id) DO UPDATE
        SET orcamento_id=EXCLUDED.orcamento_id, fase_id=EXCLUDED.fase_id,
            descricao=EXCLUDED.descricao, quantidade=EXCLUDED.quantidade, preco_unitario=EXCLUDED.preco_unitario;
    END;
  END IF;
END $$;
