-- Permite que usuários autenticados registrem auditoria (só INSERT).
-- O admin lê via service_role; usuários não veem a tabela.

drop policy if exists "audit_insert_own" on public.admin_audit_log;

create policy "audit_insert_own" on public.admin_audit_log
  for insert
  to authenticated
  with check (auth.uid() = user_id);
