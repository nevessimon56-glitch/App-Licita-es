-- Segurança: RPCs só para o próprio usuário, arquivos protegidos, limpeza restrita

-- ---------------------------------------------------------------------------
-- upsert_product_from_item — só o dono da conta
-- ---------------------------------------------------------------------------
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
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Acesso negado';
  end if;

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
-- get_product_price_stats — só o dono da conta
-- ---------------------------------------------------------------------------
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
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Acesso negado';
  end if;

  return query
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
end;
$$;

-- ---------------------------------------------------------------------------
-- purge_expired_user_data — apenas service role / postgres (cron ou admin)
-- ---------------------------------------------------------------------------
create or replace function public.purge_expired_user_data()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_folder record;
  v_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if v_role <> 'service_role' and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Acesso negado à limpeza de dados expirados';
  end if;

  for v_folder in
    select * from public.user_folders
    where expires_at < now()
  loop
    insert into public.user_analyses_archive
    select * from public.user_analyses where folder_id = v_folder.id;

    insert into public.user_proposals_archive
    select * from public.user_proposals where folder_id = v_folder.id;

    insert into public.user_folders_archive
    select * from public.user_folders where id = v_folder.id;

    delete from public.user_analyses where folder_id = v_folder.id;
    delete from public.user_proposals where folder_id = v_folder.id;
    delete from public.user_folders where id = v_folder.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.purge_expired_user_data() from public;
revoke all on function public.purge_expired_user_data() from anon;
revoke all on function public.purge_expired_user_data() from authenticated;

-- ---------------------------------------------------------------------------
-- Tabelas de arquivo — RLS sem policies (só service role)
-- ---------------------------------------------------------------------------
alter table public.user_folders_archive enable row level security;
alter table public.user_analyses_archive enable row level security;
alter table public.user_proposals_archive enable row level security;
