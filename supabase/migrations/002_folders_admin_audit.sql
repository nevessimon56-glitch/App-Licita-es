-- App Licitações — pastas, auditoria admin e retenção de 30 dias
-- Execute após 001_initial_schema.sql

-- ---------------------------------------------------------------------------
-- Pastas (uma licitação = órgão + pregão)
-- ---------------------------------------------------------------------------
create table if not exists public.user_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  orgao text default '',
  numero_pregao text default '',
  processo text default '',
  objeto text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists user_folders_user_expires_idx
  on public.user_folders (user_id, expires_at desc);

create index if not exists user_folders_user_orgao_idx
  on public.user_folders (user_id, orgao, numero_pregao);

alter table public.user_analyses
  add column if not exists folder_id uuid references public.user_folders (id) on delete set null;

alter table public.user_proposals
  add column if not exists folder_id uuid references public.user_folders (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Auditoria permanente (admin — não expira)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_email text default '',
  folder_id uuid,
  folder_title text default '',
  action text not null,
  entity_type text,
  entity_id uuid,
  summary text default '',
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_user_idx
  on public.admin_audit_log (user_id, created_at desc);

create index if not exists admin_audit_log_folder_idx
  on public.admin_audit_log (folder_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Arquivo morto (dados expirados do usuário — admin consulta)
-- ---------------------------------------------------------------------------
create table if not exists public.user_folders_archive (
  like public.user_folders including all
);

create table if not exists public.user_analyses_archive (
  like public.user_analyses including all
);

create table if not exists public.user_proposals_archive (
  like public.user_proposals including all
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
drop trigger if exists user_folders_touch_updated_at on public.user_folders;
create trigger user_folders_touch_updated_at
  before update on public.user_folders
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.user_folders enable row level security;

drop policy if exists "folders_all_own" on public.user_folders;
create policy "folders_all_own" on public.user_folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.admin_audit_log enable row level security;
-- Sem policies para usuários comuns — apenas service role / API admin

-- ---------------------------------------------------------------------------
-- Expira pastas antigas: arquiva e remove da visão do usuário
-- Rode mensalmente (pg_cron ou Edge Function agendada)
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
begin
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
