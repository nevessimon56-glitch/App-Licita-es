-- Painel admin: consultas rápidas (evita carregar tabelas inteiras no app)

create or replace function public.get_admin_dashboard_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Acesso negado';
  end if;

  return json_build_object(
    'users_count', (select count(*)::int from public.profiles),
    'active_folders', (
      select count(*)::int from public.user_folders where expires_at > now()
    ),
    'archived_folders', (
      select count(*)::int from public.user_folders_archive
    ),
    'audit_total', (select count(*)::int from public.admin_audit_log),
    'audit_today', (
      select count(*)::int
      from public.admin_audit_log
      where created_at >= date_trunc('day', now() at time zone 'utc')
    )
  );
end;
$$;

create or replace function public.get_admin_users_summary()
returns table (
  id uuid,
  full_name text,
  email text,
  created_at timestamptz,
  folders_count bigint,
  actions_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Acesso negado';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.email,
    p.created_at,
    coalesce(f.cnt, 0),
    coalesce(a.cnt, 0)
  from public.profiles p
  left join (
    select user_id, count(*)::bigint as cnt
    from public.user_folders
    group by user_id
  ) f on f.user_id = p.id
  left join (
    select user_id, count(*)::bigint as cnt
    from public.admin_audit_log
    where user_id is not null
    group by user_id
  ) a on a.user_id = p.id
  order by p.created_at desc;
end;
$$;

revoke all on function public.get_admin_dashboard_stats() from public;
revoke all on function public.get_admin_dashboard_stats() from anon;
revoke all on function public.get_admin_dashboard_stats() from authenticated;

revoke all on function public.get_admin_users_summary() from public;
revoke all on function public.get_admin_users_summary() from anon;
revoke all on function public.get_admin_users_summary() from authenticated;
