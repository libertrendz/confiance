-- 000_init_confiance.sql
create extension if not exists "uuid-ossp";

do $$ begin
  if not exists (select 1 from pg_type where typname = 'papel_enum') then
    create type papel_enum as enum ('admin','gestor','externo');
  end if;
end $$;

create table if not exists public.empresas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id),
  papel papel_enum not null default 'externo',
  nome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated
before update on public.profiles
for each row execute procedure public.set_updated_at();

create or replace function public.current_profile()
returns public.profiles
language sql stable as $$
  select p.* from public.profiles p
  where p.user_id = auth.uid()
  limit 1
$$;

-- MÓDULO PONTO
do $$ begin
  if not exists (select 1 from pg_type where typname = 'ponto_tipo_enum') then
    create type ponto_tipo_enum as enum ('entrada','pausa','retorno','saida');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'ponto_status_enum') then
    create type ponto_status_enum as enum ('pendente','aprovado','rejeitado','ajustado');
  end if;
end $$;

create table if not exists public.funcionarios (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id),
  user_id uuid unique references auth.users(id),
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_funcionarios_updated
before update on public.funcionarios
for each row execute procedure public.set_updated_at();

create table if not exists public.locais_trabalho (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id),
  nome text not null,
  latitude double precision,
  longitude double precision,
  raio_m integer default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_locais_updated
before update on public.locais_trabalho
for each row execute procedure public.set_updated_at();

create table if not exists public.horarios (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id),
  nome text not null,
  entrada time,
  saida time,
  intervalo_min integer default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_horarios_updated
before update on public.horarios
for each row execute procedure public.set_updated_at();

create table if not exists public.funcionarios_horarios (
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  horario_id uuid not null references public.horarios(id) on delete restrict,
  empresa_id uuid not null references public.empresas(id),
  primary key(funcionario_id, horario_id)
);

create table if not exists public.pontos (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id),
  funcionario_id uuid not null references public.funcionarios(id),
  tipo ponto_tipo_enum not null,
  ocorrido_em timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  foto_path text,
  origem text default 'online',
  status ponto_status_enum not null default 'pendente',
  aprovador_id uuid references auth.users(id),
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_pontos_empresa_func_data on public.pontos (empresa_id, funcionario_id, ocorrido_em desc);
create trigger trg_pontos_updated
before update on public.pontos
for each row execute procedure public.set_updated_at();

create table if not exists public.pontos_auditoria (
  id uuid primary key default uuid_generate_v4(),
  ponto_id uuid not null references public.pontos(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id),
  user_id uuid references auth.users(id),
  acao text not null,
  detalhes jsonb,
  created_at timestamptz not null default now()
);

create or replace view public.v_pendencias as
select p.*, f.nome as funcionario_nome
from public.pontos p
join public.funcionarios f on f.id = p.funcionario_id
where p.status = 'pendente';

create or replace function public.ponto_registrar(
  p_empresa_id uuid,
  p_funcionario_id uuid,
  p_tipo ponto_tipo_enum,
  p_lat double precision,
  p_lon double precision,
  p_accuracy double precision,
  p_foto_path text,
  p_origem text default 'online'
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
  v_prof public.profiles;
begin
  select * into v_prof from public.profiles where user_id=auth.uid() and empresa_id=p_empresa_id;
  if v_prof.user_id is null then
    raise exception 'sem permissão para esta empresa';
  end if;

  insert into public.pontos
    (empresa_id, funcionario_id, tipo, latitude, longitude, accuracy, foto_path, origem)
  values
    (p_empresa_id, p_funcionario_id, p_tipo, p_lat, p_lon, p_accuracy, p_foto_path, p_origem)
  returning id into v_id;

  insert into public.pontos_auditoria(ponto_id, empresa_id, user_id, acao, detalhes)
  values (v_id, p_empresa_id, auth.uid(), 'criar', jsonb_build_object('tipo', p_tipo));

  return v_id;
end
$$;

create or replace function public.ponto_decidir(
  p_ponto_id uuid,
  p_empresa_id uuid,
  p_status ponto_status_enum,
  p_observacao text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_prof public.profiles;
  v_old public.pontos;
begin
  select * into v_prof from public.profiles where user_id=auth.uid() and empresa_id=p_empresa_id;
  if v_prof.user_id is null or v_prof.papel not in ('admin','gestor') then
    raise exception 'sem permissão';
  end if;

  select * into v_old from public.pontos where id=p_ponto_id and empresa_id=p_empresa_id;
  if v_old.id is null then
    raise exception 'ponto não encontrado';
  end if;

  update public.pontos
  set status = p_status,
      aprovador_id = auth.uid(),
      observacao = p_observacao
  where id=p_ponto_id;

  insert into public.pontos_auditoria(ponto_id, empresa_id, user_id, acao, detalhes)
  values (p_ponto_id, p_empresa_id, auth.uid(), 'decidir', jsonb_build_object('novo_status', p_status, 'obs', p_observacao));

  return jsonb_build_object('ok', true, 'ponto_id', p_ponto_id, 'status', p_status);
end
$$;

-- MÓDULO ORÇAMENTOS
create table if not exists public.clientes (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id),
  nome text not null,
  nif text,
  email text,
  telefone text,
  endereco text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_clientes_updated
before update on public.clientes
for each row execute procedure public.set_updated_at();

create table if not exists public.produtos (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id),
  sku text,
  nome text not null,
  descricao text,
  preco_unit numeric(12,2) not null default 0,
  moeda text not null default 'EUR',
  unique(empresa_id, sku),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_produtos_updated
before update on public.produtos
for each row execute procedure public.set_updated_at();

create table if not exists public.orcamentos (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id),
  cliente_id uuid not null references public.clientes(id),
  ano int not null default extract(year from now())::int,
  numero_seq int not null,
  numero text not null,
  moeda text not null default 'EUR',
  subtotal numeric(12,2) not null default 0,
  impostos numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'aberto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(empresa_id, ano, numero_seq),
  unique(empresa_id, numero)
);
create index if not exists idx_orcamentos_empresa_created on public.orcamentos (empresa_id, created_at desc);
create trigger trg_orcamentos_updated
before update on public.orcamentos
for each row execute procedure public.set_updated_at();

create table if not exists public.orcamento_itens (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  produto_id uuid references public.produtos(id),
  descricao text not null,
  qtd numeric(12,3) not null default 1,
  preco_unit numeric(12,2) not null default 0,
  imposto_perc numeric(5,2) not null default 0,
  total_linha numeric(12,2) not null default 0,
  ordem int not null default 1
);
create index if not exists idx_oitens_empresa_orc on public.orcamento_itens (empresa_id, orcamento_id);

create or replace function public.orcamento_proximo_numero(p_empresa_id uuid, p_ano int default extract(year from now())::int)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_seq int;
  v_num text;
begin
  select coalesce(max(numero_seq),0)+1 into v_seq
  from public.orcamentos
  where empresa_id=p_empresa_id and ano=p_ano;

  v_num := p_ano::text || '-' || lpad(v_seq::text, 4, '0');
  return jsonb_build_object('ano', p_ano, 'seq', v_seq, 'numero', v_num);
end
$$;

create or replace function public.orcamento_recalcular(p_orcamento_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_subtotal numeric(12,2);
  v_impostos numeric(12,2);
  v_total numeric(12,2);
begin
  update public.orcamento_itens
  set total_linha = round(qtd * preco_unit * (1 + imposto_perc/100.0), 2)
  where orcamento_id = p_orcamento_id;

  select
    round(sum(qtd*preco_unit),2),
    round(sum((qtd*preco_unit) * (imposto_perc/100.0)),2),
    round(sum(qtd*preco_unit * (1 + imposto_perc/100.0)),2)
  into v_subtotal, v_impostos, v_total
  from public.orcamento_itens
  where orcamento_id = p_orcamento_id;

  update public.orcamentos
  set subtotal = coalesce(v_subtotal,0),
      impostos = coalesce(v_impostos,0),
      total = coalesce(v_total,0)
  where id = p_orcamento_id;

  return jsonb_build_object('subtotal', v_subtotal, 'impostos', v_impostos, 'total', v_total);
end
$$;

create or replace function public.orcamento_criar(
  p_empresa_id uuid,
  p_cliente_id uuid,
  p_moeda text default 'EUR'
) returns uuid
language plpgsql
security definer
as $$
declare
  v jsonb;
  v_id uuid;
begin
  v := public.orcamento_proximo_numero(p_empresa_id);
  insert into public.orcamentos(empresa_id, cliente_id, ano, numero_seq, numero, moeda)
  values (
    p_empresa_id, p_cliente_id,
    (v->>'ano')::int,
    (v->>'seq')::int,
    (v->>'numero')::text,
    p_moeda
  )
  returning id into v_id;
  return v_id;
end
$$;

-- RLS
alter table public.empresas enable row level security;
alter table public.profiles enable row level security;
alter table public.funcionarios enable row level security;
alter table public.locais_trabalho enable row level security;
alter table public.horarios enable row level security;
alter table public.funcionarios_horarios enable row level security;
alter table public.pontos enable row level security;
alter table public.pontos_auditoria enable row level security;
alter table public.clientes enable row level security;
alter table public.produtos enable row level security;
alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;

-- Empresas
create policy emp_select on public.empresas
for select using (
  exists(select 1 from public.profiles pr where pr.user_id=auth.uid() and pr.empresa_id = id)
);
create policy emp_modify on public.empresas
for all using (
  exists(select 1 from public.profiles pr where pr.user_id=auth.uid() and pr.empresa_id = id and pr.papel in ('admin','gestor'))
) with check (
  exists(select 1 from public.profiles pr where pr.user_id=auth.uid() and pr.empresa_id = id and pr.papel in ('admin','gestor'))
);

-- Profiles
create policy pr_select on public.profiles
for select using (
  user_id = auth.uid()
  or empresa_id = (select empresa_id from public.profiles where user_id=auth.uid())
);
create policy pr_update_self on public.profiles
for update using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Tabelas com empresa_id
create policy f_select on public.funcionarios
for select using (empresa_id = (select empresa_id from public.profiles where user_id=auth.uid()));
create policy f_modify on public.funcionarios
for all using (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
) with check (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
);

create policy lt_select on public.locais_trabalho
for select using (empresa_id = (select empresa_id from public.profiles where user_id=auth.uid()));
create policy lt_modify on public.locais_trabalho
for all using (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
) with check (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
);

create policy h_select on public.horarios
for select using (empresa_id = (select empresa_id from public.profiles where user_id=auth.uid()));
create policy h_modify on public.horarios
for all using (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
) with check (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
);

create policy fh_select on public.funcionarios_horarios
for select using (empresa_id = (select empresa_id from public.profiles where user_id=auth.uid()));
create policy fh_modify on public.funcionarios_horarios
for all using (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
) with check (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
);

create policy p_select on public.pontos
for select using (empresa_id = (select empresa_id from public.profiles where user_id=auth.uid()));
create policy p_insert_colab on public.pontos
for insert with check (empresa_id = (select empresa_id from public.profiles where user_id=auth.uid()));
create policy p_update_admin on public.pontos
for update using (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
) with check (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
);

create policy pa_select on public.pontos_auditoria
for select using (empresa_id = (select empresa_id from public.profiles where user_id=auth.uid()));
create policy pa_insert on public.pontos_auditoria
for insert with check (empresa_id = (select empresa_id from public.profiles where user_id=auth.uid()));

create policy c_select on public.clientes
for select using (empresa_id = (select empresa_id from public.profiles where user_id=auth.uid()));
create policy c_modify on public.clientes
for all using (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
) with check (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
);

create policy prd_select on public.produtos
for select using (empresa_id = (select empresa_id from public.profiles where user_id=auth.uid()));
create policy prd_modify on public.produtos
for all using (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
) with check (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
);

create policy o_select on public.orcamentos
for select using (empresa_id = (select empresa_id from public.profiles where user_id=auth.uid()));
create policy o_modify on public.orcamentos
for all using (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
) with check (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
);

create policy oi_select on public.orcamento_itens
for select using (empresa_id = (select empresa_id from public.profiles where user_id=auth.uid()));
create policy oi_modify on public.orcamento_itens
for all using (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
) with check (
  exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.empresa_id=empresa_id and p.papel in ('admin','gestor'))
);
