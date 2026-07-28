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

Execute **na ordem** (links diretos no GitHub):

1. [001_initial_schema.sql](https://github.com/nevessimon56-glitch/App-Licita-es/blob/main/supabase/migrations/001_initial_schema.sql)
2. [002_folders_admin_audit.sql](https://github.com/nevessimon56-glitch/App-Licita-es/blob/main/supabase/migrations/002_folders_admin_audit.sql)
3. [003_fix_audit_log_rls.sql](https://github.com/nevessimon56-glitch/App-Licita-es/blob/main/supabase/migrations/003_fix_audit_log_rls.sql)
4. [004_analysis_cache.sql](https://github.com/nevessimon56-glitch/App-Licita-es/blob/main/supabase/migrations/004_analysis_cache.sql)
5. [005_product_price_history.sql](https://github.com/nevessimon56-glitch/App-Licita-es/blob/main/supabase/migrations/005_product_price_history.sql)
6. [006_security_hardening.sql](https://github.com/nevessimon56-glitch/App-Licita-es/blob/main/supabase/migrations/006_security_hardening.sql) — segurança (obrigatório)
7. [007_admin_performance.sql](https://github.com/nevessimon56-glitch/App-Licita-es/blob/main/supabase/migrations/007_admin_performance.sql) — admin mais rápido (recomendado)

## 3. Autenticação de usuários

### Cadastro aberto vs fechado

**Cadastro aberto** = qualquer pessoa na internet pode ir em `/login` → **Criar conta** e usar o app.

Para uso profissional, recomendamos **fechar o cadastro**:

#### Opção A — No Supabase (mais seguro)
1. **Authentication → Providers → Email**
2. Desative **Enable sign ups** (ou equivalente “Allow new users to sign up”)
3. Crie usuários manualmente em **Authentication → Users → Add user**

#### Opção B — No Render (esconde o botão no app)
Adicione a variável:
```
NEXT_PUBLIC_ALLOW_REGISTRATION=false
```
> Ainda assim, desative sign ups no Supabase para bloquear totalmente.

### E-mail
- Habilite **Email**
- Em produção, ative **Confirm email** para só liberar após confirmar o e-mail

## 4. Variáveis no Render

| Variável | Obrigatória | Uso |
|----------|-------------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | Login e histórico |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Login e histórico |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim (admin) | Painel admin |
| `ADMIN_PASSWORD` | Sim (admin) | Senha do `/admin` |
| `GEMINI_API_KEY` | Sim | Análise e propostas |
| `NEXT_PUBLIC_ALLOW_REGISTRATION` | Não | `false` = esconde “Criar conta” |

Com Supabase configurado, o login passa a ser **e-mail/senha por usuário** (não use `SITE_PASSWORD` junto).

## 5. Testar

### Usuário
1. Acesse `/login` → entrar (ou criar conta, se permitido)
2. Analise um edital → **Salvar no histórico**
3. Gere proposta → **Salvar no histórico**
4. Em **Minhas licitações**, veja a pasta criada (expira em 30 dias)
5. Na proposta, use **Catálogo inteligente** por item: escolha marca → produto → **Usar média** ou **Usar último**

### Admin
1. Acesse `/admin/login` com `ADMIN_PASSWORD`
2. Veja **Auditoria** (quem salvou o quê e em qual pasta)
3. Veja **Usuários** cadastrados

## 6. Limpeza automática (30 dias)

Pastas expiram após 30 dias. A função `purge_expired_user_data()` arquiva os dados e remove da visão do usuário. O admin continua vendo histórico em `admin_audit_log` e nas tabelas `*_archive`.

### Opção 1 — Manual (mais fácil, 1× por mês)

No **SQL Editor** do Supabase, rode:

```sql
select public.purge_expired_user_data();
```

Retorna o número de pastas arquivadas/removidas.

### Opção 2 — Automática com pg_cron (Supabase Pro)

1. **Database → Extensions** → habilite `pg_cron`
2. No SQL Editor:

```sql
select cron.schedule(
  'purge-expired-licitacoes',
  '0 3 1 * *',
  $$ select public.purge_expired_user_data(); $$
);
```

Isso roda todo dia 1 do mês às 03:00 UTC.

### Opção 3 — Pelo painel admin (após deploy)

Com o app atualizado, o admin pode chamar:

```
POST /api/admin/purge
```

(logado em `/admin`). Você pode agendar isso com [cron-job.org](https://cron-job.org) 1× por mês.

## Rotas

| Rota | Quem acessa |
|------|-------------|
| `/login` | Usuários |
| `/admin/login` | Administrador |
| `/admin` | Painel admin (auditoria + usuários) |
