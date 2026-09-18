# TODO — Pré-lançamento

Lista de pendências manuais antes de subir a Nexa em produção.

---

## 📍 ONDE PARAMOS (10/09/2026)

Estado verificado com testes reais contra produção, não de memória.

### ✅ Concluído
- **Migrations 006 → 023 todas aplicadas** no projeto de produção
  (conferido em 14/09 comparando cada tabela/coluna/função com o schema real;
  020 e 021 faltavam e foram aplicadas no mesmo dia)
- **Vazamento de dados entre salões FECHADO** — `set role authenticated;
  select * from listar_lembretes_pendentes();` devolve `permission denied`
- **Env vars da Vercel configuradas** *(verificado 10/09)* — o webhook rejeita
  assinatura forjada com `No signatures found`, o que prova que
  `STRIPE_SECRET_KEY` **e** `STRIPE_WEBHOOK_SECRET` estão lá; o cron em
  produção responde `{"ok":true,...}` com o `CRON_SECRET` do `.env.local`
- **Next 16.3.4** — 2 RCEs sem autenticação fechadas; `npm audit` 5 → 0
- **Rate limit de login** escrito ([`023`](supabase/migrations/023_rate_limit_login.sql)
  + [`lib/rate-limit-login.ts`](lib/rate-limit-login.ts)) — falta aplicar a migration
- **Stripe**: 9 combinações plano × período validadas; pagamento teste real aprovado
- **Deploy**: `origin` (DiegoNexa/Nexa) e `nexaweb` (nexa-app-mx/nexa-web)
  sincronizados. **A Vercel observa o `nexaweb`** — push só no origin não
  chega em produção.

### ✅ Verificado em produção (10/09/2026)

Testes reais contra o projeto `rlxqgynqjkyughblxhdq`, não de memória:

| O quê | Como foi provado | Resultado |
|---|---|---|
| **Migration 022 aplicada** | RPC com slug inexistente + data 2 dias no passado | `data_no_passado` — a validação roda **no banco**, antes de procurar o salão |
| **Migration 023 aplicada** | `login_bloqueado(array['email:…'])` com service_role | `false` (função existe e responde) |
| **Vazamento entre salões fechado** | `listar_lembretes_pendentes()` com a chave pública | `42501 permission denied` |
| **Cron intacto** | mesma função com `service_role` | HTTP 200 |
| **Rate limit não é vetor de flood** | as 3 funções da 023 chamadas com chave pública | HTTP 401 nas três |
| **`.env.local` corrigido** | host resolve e responde | OK |


### 🔄 TROCA DE CONTA STRIPE — conta nova em uso (17/09/2026)

**Status:** conta `acct_1TS3AJHQHgaJcwyz` (a antiga Bellora, renomeada para Nexa).
Verificada: cobranças e repasses **ativos**, sem pendências, e sem herança
nenhuma (0 clientes, 0 assinaturas). Perfil, marca, ícone e logo conferidos.
Webhook do modo real criado para `/api/webhooks/stripe`; `sk_live_` e `whsec_`
na Vercel (Production), com Redeploy feito e verificado.

**A chave real NÃO pode ficar no `.env.local`** — com ela, `npm run dev` cobra
de verdade. O arquivo local usa `sk_test_`. Já precisou ser removida duas vezes.

**Falta:** colar a `sk_test_` no `.env.local`, preencher o e-mail de suporte na
Stripe e fazer o pagamento real de R$ 49 (cancelar a assinatura e reembolsar).

O histórico abaixo é do planejamento da troca.

**Motivo:** a conta `acct_1TS3AZ…` foi aberta como pessoa física com o CPF de
teste `000.000.000-00`. A verificação reprovou e, no Brasil, o CPF não pode ser
alterado depois de enviado. Decisão: apagar e abrir conta nova.

**Enquanto não houver conta nova:** o checkout em produção responde erro de
chave inválida. Salões em teste grátis não são afetados; ninguém consegue
assinar. **Nenhum código precisa mudar para a troca.**

#### 1. Ao abrir a conta nova — preencher com cuidado (trava de novo)
- Pessoa física (CPF) ou empresa (CNPJ): decidir **antes**
- **CPF/CNPJ real.** `000.000.000-00` é dado de teste e reprova na hora
- **Nome completo igual ao documento**, com todos os sobrenomes
- Data de nascimento e endereço iguais aos da Receita
- CPF regular: servicos.receita.fazenda.gov.br → situação cadastral
- Revisar tudo **antes** de enviar a verificação

#### 2. Configuração a replicar (lida da conta antiga em 14/09)
| Campo | Onde no painel | Valor |
|---|---|---|
| Nome público | Configurações → Dados públicos | `Nexa` |
| Site | idem | `https://nexa-web-pi.vercel.app` |
| E-mail de suporte | idem | **estava vazio — preencher** |
| Telefone de suporte | idem | o mesmo da conta antiga |
| Descritor na fatura | idem | `ASSINATURA NEXA` |
| Ramo (MCC) | cadastro da empresa | 7379 — serviços de informática |
| Cor da marca | Configurações → Marca | `#0E0C02` |
| Ícone e logo | idem | enviar de novo (arquivos não migram) |
| Métodos de pagamento | Configurações → Métodos de pagamento | cartão (Apple Pay estava ligado; opcional) |

País BR e moeda BRL vêm do cadastro.

#### 3. O que trocar, em ordem
| # | Onde | O quê | Quem |
|---|---|---|---|
| 1 | `.env.local` | `STRIPE_SECRET_KEY` = `sk_test_` da conta nova | usuário |
| 2 | conta nova (teste) | `node scripts/stripe-conta.mjs criar-webhook --gravar-env` — cria o endpoint com os 4 eventos e grava o `whsec_` | Claude |
| 3 | Vercel → Production | `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` de **teste** novos → Redeploy | usuário |
| 4 | verificação | `node scripts/stripe-conta.mjs verificar` — conta, perfil, webhook, se a produção aceita o segredo, checkout | Claude |
| 5 | após validação | modo real: webhook (`criar-webhook` com a `sk_live_` no ambiente) + `sk_live_` e `whsec_` real **só em Production** → Redeploy | usuário + Claude |
| 6 | verificação real | `verificar` com a `sk_live_` no ambiente (comando no topo do script) | usuário |
| 7 | teste real | Solo mensal R$ 49 → confirmar desbloqueio → cancelar assinatura → reembolsar | usuário |

**Conferir a conta pela chave:** o trecho depois de `_51` identifica a conta.
Teste e real da mesma conta começam iguais: `sk_test_51XXXX…` e `sk_live_51XXXX…`.

**Achado 14/09 — segredo divergente:** o `STRIPE_WEBHOOK_SECRET` da Vercel (Production)
é DIFERENTE do `.env.local`. A produção recusa eventos assinados com o segredo local
(`No signatures found`). Na troca, gravar o mesmo `whsec_` nos dois lugares e confirmar
com `verificar`, que agora testa isso direto contra a produção.

#### 4. O que NÃO muda (verificado em 14/09)
- **Código:** preços criados no checkout (`price_data`); nenhum ID de conta,
  produto ou preço fixo no código
- **Banco:** nenhum vínculo com a conta antiga (`assinatura_id` vazio,
  `pagamentos` vazia)
- **Git:** nenhuma chave Stripe em arquivo nem no histórico

#### 5. Perdido junto com a conta antiga (irrelevante)
Dados de teste: 2 clientes, 1 assinatura, 3 produtos e preços gerados pelo checkout.

#### 6. Bug achado na varredura — corrigido antes da troca
O webhook não encontrava o salão em `invoice.paid` e `invoice.payment_failed`:
na versão atual da API a metadata da fatura fica em
`parent.subscription_details`, e o código só conhecia o formato antigo.
Efeito: **cartão recusado na renovação nunca bloqueava o salão**, e a
`assinatura_id` podia ser sobrescrita com o id da fatura. Lógica movida para
[`lib/stripe-evento.ts`](lib/stripe-evento.ts) e testada contra eventos reais
da conta antiga. O webhook novo é criado com `api_version` fixada na versão do
SDK (a antiga usava "padrão da conta", que muda sem aviso).

### 🔒 BLOQUEADO — falta permissão no Supabase

Estes dois **não dependem de código**. A conta atual não tem permissão
para alterá-los; é preciso pedir acesso ao dono da organização no
Supabase (ou pedir que ele faça).

| O quê | Onde | Por que importa |
|---|---|---|
| **SMTP próprio (Resend)** | Authentication → Emails → SMTP Settings | Hoje o limite é **2 e-mails/hora** no projeto inteiro — SMTP de desenvolvimento. O 3º salão que se cadastrar numa hora **não recebe a confirmação**. Trava o lançamento. |
| **Baixar sign-ups/sign-ins de 30 para 15** | Authentication → Rate Limits | É o **único** controle no caminho realmente exposto (ver nota abaixo) |

**Valores do SMTP**, para quando liberar:
```
Host     : smtp.resend.com
Port     : 465
Username : resend
Password : <RESEND_API_KEY, está no .env.local>
Sender   : onboarding@resend.dev   (trocar quando o domínio entrar)
```

**Por que o limite de sign-in importa mais que a regra na Vercel:** a chave
publishable é pública por design (vai no bundle). Um atacante pode chamar
`POST supabase.co/auth/v1/token?grant_type=password` **direto**, sem passar
pelo formulário do site. Esse caminho não passa pela Vercel nem pelo
limitador da migration 023 — só o campo do Supabase o alcança.

Camadas, para não confundir:

| Caminho de ataque | Quem protege |
|---|---|
| Formulário de login do site | Migration 023 — 10 falhas / 15 min |
| API do Supabase direto | Rate Limits do painel — **bloqueado, ainda em 30** |
| Volume bruto | Vercel → Firewall (opcional) |

### ⏳ Pendente — dependem só de você

#### Situação em 17/09/2026

- 🔴 **Os lembretes por e-mail não são disparados por ninguém.** O cron foi
  removido do `vercel.json` (commit `2925389`) porque o plano Hobby só permite
  1x por dia, e a janela do lembrete é de 45 a 75 minutos antes do horário.
  O endpoint `/api/cron/lembretes` funciona, mas nada o chama.
  Opções: GitHub Actions a cada 15 min (grátis, o repo já está no GitHub),
  cron-job.org, ou pg_cron no Supabase.
- ⏳ **Teste real de R$ 49** — adiado a pedido em 17/09. Assinar Solo mensal em
  produção, confirmar o desbloqueio, conferir no painel do webhook se as
  tentativas respondem 200, depois cancelar a assinatura e reembolsar.
- ⏳ **E-mail de suporte vazio** na Stripe (Configurações → Dados públicos).
- ⏳ **EMAIL_LOGO_URL** na Vercel = `https://nexa-web-pi.vercel.app/logo.png`
  (já corrigido no `.env.local`), seguido de Redeploy.
- ⏳ **Site URL e Redirect URLs** no Supabase — sem isso o e-mail de cadastro
  aponta para localhost.


| # | O quê | Onde | Efeito de não fazer |
|---|---|---|---|
| 1 | **Site URL** = `https://nexa-web-pi.vercel.app` | Auth → URL Configuration | E-mail de cadastro aponta para localhost |
| 2 | Regra de rate limit por IP em `/login` *(opcional)* | Vercel → Firewall | Nenhuma barreira antes da aplicação; as outras duas camadas já cobrem o essencial |


### 🔵 Dependem de terceiros
- 🔄 **Stripe: conta será trocada** — ver seção TROCA DE CONTA STRIPE acima.
  - Taxa real medida nas transações: **3,99% + R$ 0,39** por cobrança.
    Idêntica para CPF ou CNPJ — a Stripe não precifica por tipo de conta.
    O que muda é a tributação do nosso lado (IRPF vs. nota fiscal).
  - O R$ 0,39 fixo pesa mais no ticket pequeno: Solo mensal perde 4,79%,
    Profissional anual perde 4,03%. Mais um argumento para o plano anual.
- **Domínio próprio** (~R$40/ano) — sem ele o Resend só entrega no e-mail da
  própria conta, então lembretes não chegam a clientes reais
- **Bot protection** — depende de chave do Cloudflare Turnstile

---

## ✅ SEGURANÇA — migration 022 aplicada (resolvido em 10/09/2026)

> Registro mantido para histórico. A falha abaixo **está fechada** —
> confirmado por teste: a chave pública recebe `42501 permission denied`
> em `listar_lembretes_pendentes()`, e a RPC de agendamento responde
> `data_no_passado`. O texto original segue como contexto do que houve.

Uma auditoria encontrou **vazamento de dados entre salões, ativo em
produção**. As duas funções do cron ([`016`](supabase/migrations/016_cron_lembretes_funcoes.sql))
foram concedidas a `authenticated` além de `service_role`:

- `listar_lembretes_pendentes()` é `SECURITY DEFINER` e **não filtra por
  salão** (foi feita para o cron varrer a base toda). Qualquer cliente
  logado da Nexa pode chamar a RPC e ler **nome, e-mail e horário dos
  clientes de TODOS os salões** — vazamento de base entre concorrentes e
  violação de LGPD.
- `marcar_lembrete_enviado(uuid)` não checa dono: dá para silenciar os
  lembretes de outro salão.

**Correção:** SQL Editor → cole [`supabase/migrations/022_seguranca.sql`](supabase/migrations/022_seguranca.sql) → Run.

A mesma migration ainda:
- Move a validação de "horário no futuro" para dentro do banco. Ela só
  existia no app, e `anon` pode chamar a RPC direto pelo PostgREST —
  dava para criar agendamento no passado e corromper folha/relatórios.
- Limita a **3 agendamentos futuros por telefone** em cada salão, contra
  quem tenta encher a agenda de horários falsos pelo link público.

**Como confirmar que fechou** (SQL Editor):
```sql
set role authenticated;
select * from listar_lembretes_pendentes();  -- deve dar permission denied
reset role;
```
E o cron deve continuar funcionando normalmente (usa `service_role`).

---

## 🚨 Pendência crítica de produção

### 📮 Trocar `EMAIL_FROM` quando o domínio for comprado

**Estado atual:** Resend está configurado em modo de teste —
`EMAIL_FROM=Nexa <onboarding@resend.dev>` só envia para o e-mail
da conta Resend (verificada). Os lembretes NÃO chegam nos clientes
reais ainda.

**Quando comprar o domínio (.com.br, .com, etc.):**

1. Resend Dashboard → `Domains` → `Add Domain`
2. Digite o domínio (ex: `nexa.com.br`)
3. Resend mostra 3 registros DNS (SPF, DKIM, MX-like)
4. Adicione esses registros no painel do seu registrar
   (Registro.br, Cloudflare, etc.)
5. Aguarde verificação (1-15 min)
6. Quando aparecer "Verified": atualize `.env.local` e produção:
   ```
   EMAIL_FROM=Nexa <lembrete@seudominio.com.br>
   ```
7. Restart do dev server / re-deploy do Vercel

Sem essa troca, **os clientes reais nunca receberão o lembrete**
— vão estar agendando mas o e-mail nunca chega.

**Custos de domínio (referência):**
- `.com.br` — Registro.br, ~R$ 40/ano
- `.com` — Cloudflare, ~US$ 10/ano (mais barato)
- Outros — variável

**Antes de comprar:** verificar na Central do Cliente do HostGator
se já existe um domínio ativo (pode já ter DNS gerenciável lá).

---

## 📌 Etapa Email/Logo — pendências anotadas (jun/2026)

Ordem de prioridade pra finalizar a parte de email:

1. **Domínio** (destrava tudo) — checar HostGator ou comprar (~R$40/ano).
   Sem ele, lembrete só chega no `daniediegozulin@gmail.com` (modo teste).
2. **Logo DENTRO do email** (independe de domínio, pode fazer já):
   - Supabase → Storage → New bucket `publico` (marcar **Public**)
   - Upload da logo (PNG transparente, ~400px, <200KB)
   - Copiar URL pública → colar no `.env.local` como `EMAIL_LOGO_URL=...`
   - Adicionar a mesma var na Vercel (produção)
   - Código já pronto ([lib/email.ts](lib/email.ts)) — sem a var, cai no texto "Nexa".
3. **EMAIL_FROM** → trocar pra domínio próprio (passos na seção acima).
4. **BIMI** (foto redonda do remetente no Gmail) — POR ÚLTIMO. Exige
   domínio + DMARC + logo SVG + às vezes VMC pago. Impossível com
   `onboarding@resend.dev`.

**Conferir migrations aplicadas no Supabase:** 013, 014, 015, 016
(015 e 016 já aplicadas nos testes; confirmar 013 e 014 senão o
link público quebra).

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

## 💳 Ativar cobrança (Stripe) — mais recente

Migramos do AbacatePay para a Stripe. Motivo: a API do AbacatePay
divergia da documentação em vários pontos (evento `billing.paid`
inexistente na v2, `externalId` interpretado como cliente, produto
recorrente indisponível em modo de teste, chave com "version
mismatch"). A Stripe funcionou de primeira.

**Trade-off consciente:** perde-se o PIX a R$0,80 fixo. A Stripe cobra
~3,99% + R$0,39 no cartão (~R$8,33 no plano Premium). PIX na Stripe
exige ativação à parte e **não** funciona em assinatura recorrente.

### 🔒 O bloqueio continua ATIVO
Regra inalterada em `acessoBloqueado()` ([`lib/planos.ts`](lib/planos.ts)):
`ativa` livre · `trial` até vencer · `inadimplente` +3 dias de graça ·
`cancelada` bloqueado. O link público `/agendar/[slug]` segue no ar.

### Periodicidades disponíveis
Mensal (cheio) · Semestral (**-5%**) · Anual (**-20%**). O seletor fica
acima dos cards de plano; o preço exibido é sempre **por mês**, para os
períodos serem comparáveis, com o total cobrado logo abaixo.

| Plano | Mensal | Semestral | Anual |
|---|---|---|---|
| Solo | R$ 49 | R$ 279 | R$ 470 |
| Profissional | R$ 99 | R$ 564 | R$ 950 |
| Premium | R$ 199 | R$ 1.134 | R$ 1.910 |

Valores calculados em [`lib/planos.ts`](lib/planos.ts) a partir do preço
mensal — mudar o desconto ali muda tudo, inclusive o que a Stripe cobra.

### Passo 1 — Chaves
Stripe → **Developers → API keys** → copie a **Secret key**.
Em `.env.local` e na Vercel:
```
STRIPE_SECRET_KEY=sk_test_...     (produção: sk_live_...)
```
Não é preciso cadastrar produto nem preço: o checkout usa `price_data`
inline, com os valores de [`lib/planos.ts`](lib/planos.ts).

### Passo 2 — Webhook
Stripe → **Developers → Webhooks → Add endpoint**
- URL: `https://nexa-web-pi.vercel.app/api/webhooks/stripe`
- Eventos: `checkout.session.completed`, `invoice.paid`,
  `invoice.payment_failed`, `customer.subscription.deleted`
- Copie o **Signing secret** (`whsec_...`) para `STRIPE_WEBHOOK_SECRET`

### Passo 3 — Testar local (sem deploy)
A Stripe alcança o localhost pelo CLI:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
O comando imprime um `whsec_...` — use ESSE no `.env.local` enquanto
testa localmente. Depois: Configurações → Assinar → cartão de teste
`4242 4242 4242 4242`, validade futura, CVC qualquer.

### Passo 4 — Conferir
```sql
select assinatura_status, plano from saloes;
select evento, valor, metodo from pagamentos order by created_at desc limit 5;
```
Status deve virar `ativa` e aparecer linha em `pagamentos` com metodo `stripe`.

> ⚠️ A conta está com `charges_enabled: false` — normal antes de
> completar a ativação. Não impede testes em modo de teste, mas
> **impede cobranças reais**: conclua o cadastro na Stripe antes do
> lançamento.

> A coluna `saloes.documento` (migration 021) deixou de ser
> obrigatória — a Stripe coleta os dados do pagador no próprio
> checkout. A coluna pode ficar; é útil para nota fiscal no futuro.

---

## 📋 Outras pendências pré-deploy

### ⏳ Aplicar migration 019 no Supabase (mais recente — Despesas recorrentes)
Cria `despesas_recorrentes` (moldes fixos mensal/semanal),
`despesas_recorrentes_log` (idempotência) e a função
`gerar_despesas_recorrentes(inicio, fim)` que materializa as
ocorrências do mês visualizado. A coluna `despesas.recorrente_id`
liga a ocorrência ao molde.
Conteúdo em [`supabase/migrations/019_despesas_recorrentes.sql`](supabase/migrations/019_despesas_recorrentes.sql).
SQL Editor → cole → Run. **Aplicar depois da 018.**

### ⏳ Aplicar migration 018 no Supabase (mais recente — Financeiro)
Cria a tabela `despesas` (descrição, categoria, valor, data) com RLS
via `current_salao_id()`. Base do Pilar 5 (Gestão Financeira). O
resultado do mês (faturamento − folha − despesas = lucro) é montado
no app reutilizando o cálculo da folha.
Conteúdo em [`supabase/migrations/018_despesas.sql`](supabase/migrations/018_despesas.sql).
SQL Editor → cole → Run.

### ⏳ Aplicar migration 017 no Supabase (mais recente — Estoque)
Cria as tabelas `produtos` e `movimentos_estoque` (com RLS via
`current_salao_id()`) e a função `registrar_movimento_estoque()`
que aplica entrada/saída de forma atômica e bloqueia estoque negativo.
Base do Pilar 3 (Gestão de Estoque).
Conteúdo em [`supabase/migrations/017_estoque.sql`](supabase/migrations/017_estoque.sql).
SQL Editor → cole → Run.

> **Baixa de estoque é manual** (por decisão de produto): use o botão
> **Saída** na tela do produto. A baixa automática por serviço foi
> removida por exigir pré-cálculo de consumo que raramente bate com a
> realidade.

### ⏳ Aplicar migration 016 no Supabase (mais recente)
Cria funções `listar_lembretes_pendentes()` e `marcar_lembrete_enviado(id)`
SECURITY DEFINER que o cron usa. Resolve o erro "permission denied for
table agendamentos" que ocorre em projetos Supabase novos onde o
service_role não tem GRANT automático.
Conteúdo em [`supabase/migrations/016_cron_lembretes_funcoes.sql`](supabase/migrations/016_cron_lembretes_funcoes.sql).
SQL Editor → cole → Run.

### ⏳ Aplicar migration 015 no Supabase
Adiciona coluna `lembrete_enviado boolean default false` em `agendamentos`
+ índice parcial pra cron achar rapidamente os pendentes.
Conteúdo em [`supabase/migrations/015_agendamentos_lembrete.sql`](supabase/migrations/015_agendamentos_lembrete.sql).
SQL Editor → cole → Run.

### 🔧 Configurar lembretes por e-mail (Resend + Cron)

**Visão geral:** cron roda a cada 15 min, busca agendamentos
começando em ~1h (janela 45–75min), envia e-mail pra clientes
com email cadastrado.

#### Passo 1 — Criar conta no Resend
1. Acesse `resend.com` → criar conta grátis (100 e-mails/dia)
2. **Verificação de domínio:**
   - **Em produção:** essencial → `Domains` → `Add Domain` → seguir DNS.
     Veja a 🚨 Pendência crítica no topo deste arquivo.
   - **Modo de teste atual (sem domínio):** pula essa etapa.
     `EMAIL_FROM=Nexa <onboarding@resend.dev>` envia SÓ pro e-mail
     da sua conta Resend (verificada no signup). Útil pra validar
     o template e o fluxo do cron antes de comprar o domínio.

#### Passo 2 — Gerar API Key
- `API Keys` → `Create API Key`
- Permissão: `Send access` (sem permissão de gerenciar)
- Copie o valor `re_...`

#### Passo 3 — Pegar SUPABASE_SECRET_KEY
- Supabase Dashboard → `Settings` → `API`
- Copie `service_role` key (`sb_secret_...`)
- ⚠️ Bypassa RLS — só usa no servidor

#### Passo 4 — Gerar CRON_SECRET
- Qualquer string aleatória forte. Sugestão:
  ```bash
  openssl rand -base64 32
  ```

#### Passo 5 — Configurar env vars

**Local (`.env.local`):**
```
RESEND_API_KEY=re_seu_token_aqui
SUPABASE_SECRET_KEY=sb_secret_seu_valor_aqui
CRON_SECRET=string_aleatoria_aqui
EMAIL_FROM=Nexa <lembrete@seudominio.com.br>
```

**Produção (Vercel):**
- Project → `Settings` → `Environment Variables`
- Adicionar os mesmos 4 valores
- Marcar como `Production` (e `Preview` se quiser)

#### Passo 6 — Cron

> ⚠️ **Vercel Hobby (grátis) só permite cron 1x/dia.** Por isso NÃO usamos
> mais o cron do `vercel.json` (foi removido). Use um **cron externo**
> chamando o endpoint a cada 15 min (funciona em qualquer plano).

**Cron externo (recomendado no Hobby):** aponte pra
`https://SEU_APP.vercel.app/api/cron/lembretes` com header
`Authorization: Bearer SEU_CRON_SECRET`, a cada 15 min. Opções grátis:
- **cron-job.org** (mais simples): New cronjob → URL do endpoint →
  Schedule "Every 15 minutes" → aba Advanced → Header
  `Authorization: Bearer SEU_CRON_SECRET` → salvar.
- EasyCron (grátis até certo limite)
- GitHub Actions (workflow com `schedule` + `curl`)

**Se um dia migrar pra Vercel Pro:** dá pra voltar a usar cron nativo
recriando um `vercel.json`:
```json
{ "crons": [{ "path": "/api/cron/lembretes", "schedule": "*/15 * * * *" }] }
```
Nesse caso a Vercel envia o `Authorization: Bearer ${CRON_SECRET}` sozinha.

#### Passo 7 — Testar
```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  https://seudominio.com/api/cron/lembretes
```
Resposta JSON com `enviados`, `candidatos`, `erros`.

### ⏳ Aplicar migration 014 no Supabase
Adiciona parâmetro `p_cliente_email` (opcional) na função `criar_agendamento_publico`.
- Cliente novo: salva o email no cadastro.
- Cliente existente (encontrado por telefone): completa email se ainda não tinha.
Usado pra enviar lembrete do agendamento por e-mail (infra de envio pendente).
Conteúdo em [`supabase/migrations/014_agendar_publico_email.sql`](supabase/migrations/014_agendar_publico_email.sql).
SQL Editor → cole → Run.

### ⏳ Aplicar migration 013 no Supabase
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
