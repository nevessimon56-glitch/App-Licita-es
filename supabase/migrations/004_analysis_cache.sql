-- Cache de análise por hash de documentos (economia de tokens Gemini)

create table if not exists public.analysis_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content_hash text not null,
  analysis_mode text not null default 'completo',
  analysis_markdown text not null,
  document_names text[] not null default '{}',
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create unique index if not exists analysis_cache_user_hash_mode_uidx
  on public.analysis_cache (user_id, content_hash, analysis_mode);

create index if not exists analysis_cache_user_last_used_idx
  on public.analysis_cache (user_id, last_used_at desc);

alter table public.analysis_cache enable row level security;

drop policy if exists "analysis_cache_all_own" on public.analysis_cache;
create policy "analysis_cache_all_own" on public.analysis_cache
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
