-- Histórico de preços por produto/marca/modelo (média ao longo do tempo)

create table if not exists public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  catalog_id uuid references public.product_catalog (id) on delete set null,
  codigo text default '',
  titulo_produto text not null default '',
  fabricante text not null default '',
  marca_modelo text not null default '',
  unidade text not null default 'UND',
  valor_unitario numeric(15, 2) not null,
  orgao text default '',
  numero_pregao text default '',
  proposal_id uuid,
  folder_id uuid,
  created_at timestamptz not null default now(),
  constraint product_price_history_valor_positive check (valor_unitario >= 0)
);

create index if not exists product_price_history_user_fabricante_idx
  on public.product_price_history (user_id, fabricante, marca_modelo);

create index if not exists product_price_history_user_marca_idx
  on public.product_price_history (user_id, upper(trim(marca_modelo)));

create index if not exists product_price_history_user_created_idx
  on public.product_price_history (user_id, created_at desc);

alter table public.product_price_history enable row level security;

drop policy if exists "price_history_all_own" on public.product_price_history;
create policy "price_history_all_own" on public.product_price_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Média de preço por fabricante + modelo
create or replace function public.get_product_price_stats(
  p_user_id uuid,
  p_fabricante text,
  p_marca_modelo text
)
returns table (
  sample_count bigint,
  avg_price numeric,
  min_price numeric,
  max_price numeric,
  last_price numeric,
  last_orgao text,
  last_pregao text,
  last_used_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    round(avg(valor_unitario), 2),
    min(valor_unitario),
    max(valor_unitario),
    (
      select h.valor_unitario
      from public.product_price_history h
      where h.user_id = p_user_id
        and upper(trim(h.fabricante)) = upper(trim(p_fabricante))
        and upper(trim(h.marca_modelo)) = upper(trim(p_marca_modelo))
      order by h.created_at desc
      limit 1
    ),
    (
      select h.orgao
      from public.product_price_history h
      where h.user_id = p_user_id
        and upper(trim(h.fabricante)) = upper(trim(p_fabricante))
        and upper(trim(h.marca_modelo)) = upper(trim(p_marca_modelo))
      order by h.created_at desc
      limit 1
    ),
    (
      select h.numero_pregao
      from public.product_price_history h
      where h.user_id = p_user_id
        and upper(trim(h.fabricante)) = upper(trim(p_fabricante))
        and upper(trim(h.marca_modelo)) = upper(trim(p_marca_modelo))
      order by h.created_at desc
      limit 1
    ),
    max(created_at)
  from public.product_price_history
  where user_id = p_user_id
    and upper(trim(fabricante)) = upper(trim(p_fabricante))
    and upper(trim(marca_modelo)) = upper(trim(p_marca_modelo))
    and trim(marca_modelo) <> '';
$$;
