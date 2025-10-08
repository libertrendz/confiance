-- Seed v3 – projetos, fases, orçamento principal e alguns itens
-- Idempotente: usa IDs fixos + ON CONFLICT; só executa blocos se as tabelas existirem.

DO $$
DECLARE
  v_empresa_id  uuid := 'f82c84b2-cff3-4526-99af-94de4b0878dc'; -- Confiance (fixado no seed v2)
  v_projeto_id  uuid := 'a1111111-1111-1111-1111-111111111001';
  v_fase1_id    uuid := 'a1111111-1111-1111-1111-111111111101';
  v_fase2_id    uuid := 'a1111111-1111-1111-1111-111111111102';
  v_fase3_id    uuid := 'a1111111-1111-1111-1111-111111111103';
  v_orc_id      uuid := 'b2222222-2222-2222-2222-222222222001';
  v_item1_id    uuid := 'c3333333-3333-3333-3333-333333333101';
  v_item2_id    uuid := 'c3333333-3333-3333-3333-333333333102';
  v_item3_id    uuid := 'c3333333-3333-3333-3333-333333333103';
BEGIN
  -- Garante a empresa (caso seed v2 não tenha sido aplicado por algum motivo)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='empresas') THEN
    INSERT INTO public.empresas (id, nome)
    VALUES (v_empresa_id, 'Confiance')
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;
  END IF;

  -- Projeto
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='projetos') THEN
    -- Ajuste os nomes/colunas conforme o teu schema (status, descricao, etc.)
    INSERT INTO public.projetos (id, empresa_id, nome, status)
    VALUES (v_projeto_id, v_empresa_id, 'Obra A', 'ativo')
    ON CONFLICT (id) DO UPDATE SET
      empresa_id = EXCLUDED.empresa_id,
      nome       = EXCLUDED.nome,
      status     = EXCLUDED.status;
  END IF;

  -- Fases
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fases') THEN
    INSERT INTO public.fases (id, projeto_id, nome, ordem, status)
    VALUES
      (v_fase1_id, v_projeto_id, 'Fase 1', 1, 'planeada'),
      (v_fase2_id, v_projeto_id, 'Fase 2', 2, 'planeada'),
      (v_fase3_id, v_projeto_id, 'Fase 3', 3, 'planeada')
    ON CONFLICT (id) DO UPDATE SET
      projeto_id = EXCLUDED.projeto_id,
      nome       = EXCLUDED.nome,
      ordem      = EXCLUDED.ordem,
      status     = EXCLUDED.status;
  END IF;

  -- Orçamento principal
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orcamentos') THEN
    -- Campos comuns: (id, projeto_id, nome, tipo, moeda, status). Ajusta se teu schema divergir.
    INSERT INTO public.orcamentos (id, projeto_id, nome, tipo, moeda, status)
    VALUES (v_orc_id, v_projeto_id, 'Orçamento Principal', 'PRINCIPAL', 'EUR', 'ativo')
    ON CONFLICT (id) DO UPDATE SET
      projeto_id = EXCLUDED.projeto_id,
      nome       = EXCLUDED.nome,
      tipo       = EXCLUDED.tipo,
      moeda      = EXCLUDED.moeda,
      status     = EXCLUDED.status;
  END IF;

  -- Itens do orçamento (1 por fase só para amostra)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orcamentos_itens') THEN
    -- Campos comuns: (id, orcamento_id, fase_id, categoria, descricao, quantidade, preco_unitario)
    INSERT INTO public.orcamentos_itens (id, orcamento_id, fase_id, categoria, descricao, quantidade, preco_unitario)
    VALUES
      (v_item1_id, v_orc_id, v_fase1_id, 'Materiais', 'Cimento CP II',    100, 5.50),
      (v_item2_id, v_orc_id, v_fase2_id, 'Mão de obra','Alvenaria bloco',  80,  12.00),
      (v_item3_id, v_orc_id, v_fase3_id, 'Serviços',  'Impermeabilização', 10,  150.00)
    ON CONFLICT (id) DO UPDATE SET
      orcamento_id   = EXCLUDED.orcamento_id,
      fase_id        = EXCLUDED.fase_id,
      categoria      = EXCLUDED.categoria,
      descricao      = EXCLUDED.descricao,
      quantidade     = EXCLUDED.quantidade,
      preco_unitario = EXCLUDED.preco_unitario;
  END IF;

  -- Nota: se existir trigger de recálculo do total do orçamento, ela tratará os totais.
END $$;
