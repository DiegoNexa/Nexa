# TODO — Pré-lançamento

Lista de pendências manuais antes de subir a Nexa em produção.

---

## 🔮 Funcionalidades adiadas (não vão no v1.0)

- **WhatsApp + IA para agendamento automático** — plano técnico preservado em [`ROADMAP.md`](ROADMAP.md). Adiado por custo operacional alto (APIs + tokens GPT). Gatilhos para retomar listados no roadmap.

---

## 🌐 Configurar domínio final (faça quando o domínio estiver decidido)

Quando você comprar/definir o domínio (ex: `nexa.com.br`, `app.nexa.com.br`), **três lugares** precisam ser atualizados em sequência:

### Passo 1 — Editar [`app/recuperar-senha/actions.ts`](app/recuperar-senha/actions.ts)

Procure pelo bloco `ALLOWED_HOSTS` (linha ~24) e atualize:

```ts
const ALLOWED_HOSTS = new Set([
  "localhost:3000",          // manter pra dev local
  "SEU_DOMINIO.com.br",      // ← adicionar domínio principal
  "www.SEU_DOMINIO.com.br",  // ← se for usar www
  "app.SEU_DOMINIO.com.br",  // ← se usar subdomínio dedicado
]);
const FALLBACK_HOST = "SEU_DOMINIO.com.br";  // ← domínio principal
```

### Passo 2 — Atualizar Supabase Dashboard

**Caminho:** `Authentication` → `URL Configuration`

**Em `Redirect URLs`** — adicionar uma linha para cada host, com `/auth/callback` no final:

```
http://localhost:3000/auth/callback
https://SEU_DOMINIO.com.br/auth/callback
https://www.SEU_DOMINIO.com.br/auth/callback
https://app.SEU_DOMINIO.com.br/auth/callback
```

**Em `Site URL`** — colocar o domínio principal de produção (apenas um):

```
https://SEU_DOMINIO.com.br
```

### Passo 3 — Testar

1. `npm run dev`
2. Acesse `http://localhost:3000/recuperar-senha`
3. Peça reset para o seu e-mail
4. Confira que o link no e-mail aponta pro host correto
5. Clica no link → deve cair em `/redefinir-senha` autenticado

**Se algo travar:**
- Link aparece com host errado → falta atualizar `Site URL` no Supabase
- Link dá erro ao clicar → falta adicionar em `Redirect URLs` no Supabase
- Tudo certo local mas não em prod → conferir variáveis de ambiente na Vercel

### Passo 4 — Commit + deploy

```bash
git add app/recuperar-senha/actions.ts
git commit -m "Atualiza allowlist de hosts para domínio de produção"
git push
```

---

## 📋 Outras pendências pré-deploy

### ⏳ Aplicar migration 013 no Supabase (mais recente)
Cria funções SECURITY DEFINER para o link público de agendamento.
Permite que clientes finais marquem horário em `/agendar/[slug]` sem login.
Inclui: `get_salao_publico`, `get_servicos_publico`, `get_profissionais_publico`,
`get_bloqueios_publico`, `get_carga_horaria_publico`, `get_agendamentos_publico`,
`criar_agendamento_publico`, `get_confirmacao_publico`.
Conteúdo em [`supabase/migrations/013_link_publico.sql`](supabase/migrations/013_link_publico.sql).
SQL Editor → cole → Run.

### ⏳ Aplicar migration 012 no Supabase
Adiciona `salario_fixo` em `profissionais` para salões com salário base + comissão.
Conteúdo em [`supabase/migrations/012_salario_fixo.sql`](supabase/migrations/012_salario_fixo.sql).
SQL Editor → cole → Run.

### ⏳ Aplicar migration 011 no Supabase
Adiciona coluna `atende` em `comissoes_config` (perm. ao profissional não realizar certos serviços).
Conteúdo em [`supabase/migrations/011_comissoes_atende.sql`](supabase/migrations/011_comissoes_atende.sql).
SQL Editor → cole → Run.

### ⏳ Aplicar migration 010 no Supabase
Cria tabela `movimentos_folha` (vales, adiantamentos, descontos, bônus) com RLS.
Conteúdo em [`supabase/migrations/010_movimentos_folha.sql`](supabase/migrations/010_movimentos_folha.sql).
SQL Editor → cole → Run.

### ⏳ Aplicar migration 009 no Supabase
Comissão padrão por profissional + tabela `comissoes_config` (overrides por serviço).
Conteúdo em [`supabase/migrations/009_profissionais_comissoes.sql`](supabase/migrations/009_profissionais_comissoes.sql).
SQL Editor → cole → Run.

### 🚨 Aplicar migration 007 no Supabase (URGENTE — bug crítico)
**Conserta recursão infinita** nas policies de RLS — sem isso, qualquer operação em qualquer tabela falha com `infinite recursion detected in policy`. O dashboard também estava silenciosamente quebrado (mostrava "Salão" genérico).

Conteúdo em [`supabase/migrations/007_fix_rls_recursion.sql`](supabase/migrations/007_fix_rls_recursion.sql).
SQL Editor → cole → Run.

(Status: aguardando execução manual)

### ⏳ Aplicar migration 006 no Supabase
Cria o schema da Agenda (profissionais, serviços, clientes, carga_horaria, agendamentos) com RLS, indexes, EXCLUDE constraint anti-sobreposição e triggers de validação.

Conteúdo em [`supabase/migrations/006_agenda_schema.sql`](supabase/migrations/006_agenda_schema.sql).
SQL Editor → cole → Run.

(Status: aguardando execução manual — **aplicar ANTES da 007**)

### ✅ Migrations anteriores aplicadas
- 001 → schema inicial (saloes, usuarios)
- 002 → slug mínimo 4 chars
- 003 → trigger de signup
- 004 → lock de execute em handle_new_user
- 005 → hardening (lock auto-promoção + revalidação no trigger)

### ⏳ Configurar SMTP próprio (Resend)
Sem isso, fica preso no rate limit grátis do Supabase (2-4 e-mails/hora). Em produção é inviável.

1. Criar conta em `resend.com` (100 e-mails/dia grátis)
2. Gerar API key
3. No Supabase: `Project Settings` → `Auth` → `SMTP Settings` → Enable Custom SMTP
4. Preencher host (`smtp.resend.com`), port (465), username (`resend`), password (API key)

### ✅ Email Confirmation ligado
Já feito.

### ✅ Leaked Password Protection ligado
Já feito.

### ✅ Templates de e-mail customizados (Confirm signup + Reset password)
Já feitos no Supabase Dashboard.

---

## 🚦 Antes de "Go live"

- [ ] Domínio configurado nos 3 lugares (passos acima)
- [ ] Migration 006 aplicada
- [ ] SMTP Resend configurado
- [ ] Teste end-to-end do fluxo: cadastro → confirmação por e-mail → login → reset de senha → novo login
- [ ] Variáveis de ambiente no host de deploy (Vercel/etc) — copiar valores do `.env.local`
