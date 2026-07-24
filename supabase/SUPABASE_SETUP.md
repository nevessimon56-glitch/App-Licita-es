# Configuração do Supabase — App Licitações

Siga estes passos na ordem. Leva cerca de 15 minutos.

## 1. Criar projeto

1. Acesse [supabase.com](https://supabase.com) e crie um projeto.
2. Em **Settings → API**, copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (nunca exponha no front-end)

## 2. Rodar o SQL

No painel: **SQL Editor → New query**

Execute **na ordem**:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_folders_admin_audit.sql`

## 3. Autenticação de usuários

Em **Authentication → Providers → Email**:

- Habilite **Email**
- Para testes rápidos, desative **Confirm email** (ou confirme o e-mail manualmente)

## 4. Variáveis no Render

| Variável | Obrigatória | Uso |
|----------|-------------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | Login e histórico |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Login e histórico |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim (admin) | Painel admin |
| `ADMIN_PASSWORD` | Sim (admin) | Senha do `/admin` |
| `GEMINI_API_KEY` | Sim | Análise e propostas |

Com Supabase configurado, o login passa a ser **e-mail/senha por usuário** (não use `SITE_PASSWORD` junto).

## 5. Testar

### Usuário
1. Acesse `/login` → criar conta
2. Analise um edital → **Salvar no histórico**
3. Gere proposta → **Salvar no histórico**
4. Em **Minhas licitações**, veja a pasta criada (expira em 30 dias)

### Admin
1. Acesse `/admin/login` com `ADMIN_PASSWORD`
2. Veja **Auditoria** (quem salvou o quê e em qual pasta)
3. Veja **Usuários** cadastrados

## 6. Limpeza automática (30 dias)

A função `purge_expired_user_data()` arquiva pastas expiradas e remove da visão do usuário.

Para agendar mensalmente no Supabase (pg_cron):

```sql
select cron.schedule(
  'purge-expired-licitacoes',
  '0 3 1 * *',
  $$ select public.purge_expired_user_data(); $$
);
```

> Requer extensão `pg_cron` habilitada no projeto.

O **admin** continua vendo o histórico em `admin_audit_log` e nas tabelas `*_archive`.

## Rotas

| Rota | Quem acessa |
|------|-------------|
| `/login` | Usuários |
| `/admin/login` | Administrador |
| `/admin` | Painel admin (auditoria + usuários) |
