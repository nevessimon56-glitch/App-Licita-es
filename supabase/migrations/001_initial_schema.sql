-- App Licitações — schema inicial Supabase
-- Execute no SQL Editor do Supabase ou via CLI: supabase db push

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Perfil do usuário (espelha auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Análises salvas
-- ---------------------------------------------------------------------------
create table if not exists public.user_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  orgao text default '',
  objeto text default '',
  numero_pregao text default '',
  processo text default '',
  analysis_mode text not null default 'completo',
  analysis_markdown text not null,
  document_names text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_analyses_user_created_idx
  on public.user_analyses (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Propostas salvas (JSON completo do pacote)
-- ---------------------------------------------------------------------------
create table if not exists public.user_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  analysis_id uuid references public.user_analyses (id) on delete set null,
  company_id text not null default 'torquato-filial-palmas',
  title text not null,
  orgao text default '',
  objeto text default '',
  numero_pregao text default '',
  processo text default '',
  package_data jsonb not null,
  grand_total numeric(15, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_proposals_user_created_idx
  on public.user_proposals (user_id, created_at desc);

create index if not exists user_proposals_search_idx
  on public.user_proposals (user_id, orgao, numero_pregao);

-- ---------------------------------------------------------------------------
-- Catálogo de produtos do usuário (marca/modelo aprendidos ao longo do tempo)
-- ---------------------------------------------------------------------------
create table if not exists public.product_catalog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  codigo text default '',
  titulo_produto text not null default '',
  descricao text not null default '',
  unidade text not null default 'UND',
  fabricante text not null default '',
  marca_modelo text not null default '',
  sem_instalacao boolean not null default true,
  valor_unitario_referencia numeric(15, 2),
  uso_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_catalog_titulo_not_blank check (char_length(trim(titulo_produto)) > 0)
);

create unique index if not exists product_catalog_user_codigo_uidx
  on public.product_catalog (user_id, codigo)
  where codigo is not null and trim(codigo) <> '';

create index if not exists product_catalog_user_titulo_idx
  on public.product_catalog (user_id, upper(trim(titulo_produto)));

create index if not exists product_catalog_user_last_used_idx
  on public.product_catalog (user_id, last_used_at desc nulls last);

-- ---------------------------------------------------------------------------
-- Log de atividades
-- ---------------------------------------------------------------------------
create table if not exists public.user_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_activity_log_user_created_idx
  on public.user_activity_log (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists user_analyses_touch_updated_at on public.user_analyses;
create trigger user_analyses_touch_updated_at
  before update on public.user_analyses
  for each row execute function public.touch_updated_at();

drop trigger if exists user_proposals_touch_updated_at on public.user_proposals;
create trigger user_proposals_touch_updated_at
  before update on public.user_proposals
  for each row execute function public.touch_updated_at();

drop trigger if exists product_catalog_touch_updated_at on public.product_catalog;
create trigger product_catalog_touch_updated_at
  before update on public.product_catalog
  for each row execute function public.touch_updated_at();

-- Salva/atualiza produto a partir de um item de proposta
create or replace function public.upsert_product_from_item(
  p_user_id uuid,
  p_codigo text,
  p_titulo_produto text,
  p_descricao text,
  p_unidade text,
  p_fabricante text,
  p_marca_modelo text,
  p_sem_instalacao boolean,
  p_valor_unitario numeric
)
returns public.product_catalog
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.product_catalog;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
  v_titulo text := trim(coalesce(p_titulo_produto, ''));
  v_fabricante text := trim(coalesce(p_fabricante, ''));
  v_marca text := trim(coalesce(p_marca_modelo, ''));
begin
  if v_titulo = '' then
    raise exception 'titulo_produto é obrigatório';
  end if;

  if v_codigo <> '' then
    insert into public.product_catalog (
      user_id, codigo, titulo_produto, descricao, unidade,
      fabricante, marca_modelo, sem_instalacao, valor_unitario_referencia,
      uso_count, last_used_at
    )
    values (
      p_user_id, v_codigo, v_titulo, coalesce(p_descricao, ''), coalesce(nullif(trim(p_unidade), ''), 'UND'),
      v_fabricante, v_marca, coalesce(p_sem_instalacao, true), p_valor_unitario,
      1, now()
    )
    on conflict (user_id, codigo)
    do update set
      titulo_produto = excluded.titulo_produto,
      descricao = case when trim(excluded.descricao) <> '' then excluded.descricao else product_catalog.descricao end,
      unidade = excluded.unidade,
      fabricante = case when v_fabricante <> '' then v_fabricante else product_catalog.fabricante end,
      marca_modelo = case when v_marca <> '' then v_marca else product_catalog.marca_modelo end,
      sem_instalacao = excluded.sem_instalacao,
      valor_unitario_referencia = coalesce(p_valor_unitario, product_catalog.valor_unitario_referencia),
      uso_count = product_catalog.uso_count + 1,
      last_used_at = now(),
      updated_at = now()
    returning * into v_row;

    return v_row;
  end if;

  select *
  into v_row
  from public.product_catalog
  where user_id = p_user_id
    and upper(trim(titulo_produto)) = upper(v_titulo)
    and (trim(codigo) = '' or codigo is null)
  order by last_used_at desc nulls last
  limit 1;

  if found then
    update public.product_catalog
    set
      descricao = case when trim(coalesce(p_descricao, '')) <> '' then p_descricao else descricao end,
      unidade = coalesce(nullif(trim(p_unidade), ''), unidade),
      fabricante = case when v_fabricante <> '' then v_fabricante else fabricante end,
      marca_modelo = case when v_marca <> '' then v_marca else marca_modelo end,
      sem_instalacao = coalesce(p_sem_instalacao, sem_instalacao),
      valor_unitario_referencia = coalesce(p_valor_unitario, valor_unitario_referencia),
      uso_count = uso_count + 1,
      last_used_at = now(),
      updated_at = now()
    where id = v_row.id
    returning * into v_row;

    return v_row;
  end if;

  insert into public.product_catalog (
    user_id, codigo, titulo_produto, descricao, unidade,
    fabricante, marca_modelo, sem_instalacao, valor_unitario_referencia,
    uso_count, last_used_at
  )
  values (
    p_user_id, '', v_titulo, coalesce(p_descricao, ''), coalesce(nullif(trim(p_unidade), ''), 'UND'),
    v_fabricante, v_marca, coalesce(p_sem_instalacao, true), p_valor_unitario,
    1, now()
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_analyses enable row level security;
alter table public.user_proposals enable row level security;
alter table public.product_catalog enable row level security;
alter table public.user_activity_log enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "analyses_all_own" on public.user_analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "proposals_all_own" on public.user_proposals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "products_all_own" on public.product_catalog
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "activity_all_own" on public.user_activity_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
