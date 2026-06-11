# Roadmap pós-lançamento

Funcionalidades que **foram planejadas** mas **adiadas para depois do v1.0** por motivos de custo operacional ou complexidade.

Este arquivo preserva o plano técnico já estudado, pra ser retomado quando fizer sentido.

---

## 🔮 WhatsApp + IA para agendamento automático

### Por que foi adiado

- **Custo operacional alto** das APIs oficiais (Meta Cloud API ~R$0,05–0,35/mensagem)
- **Risco de ban** em provedores não-oficiais (Evolution API self-hosted)
- **Custo da IA** (OpenAI tokens) somado ao volume de mensagens é proibitivo no early stage
- **MVP** prioriza ferramenta sólida de gestão; integração com WhatsApp vira diferencial após validação

### Visão original (preservada)

#### Fluxo proposto

```
Cliente envia msg no WhatsApp
    ↓
Evolution API recebe
    ↓
GPT interpreta linguagem natural (serviço, profissional, data/hora)
    ↓
Webhook POST → /api/whatsapp/webhook
    ↓
Server verifica disponibilidade na agenda
    ↓
INSERT em agendamentos (origem='whatsapp')
    ↓
Evolution responde ao cliente: "Agendado! Sexta 14h com Ana"
    ↓
Lembrete 24h antes (utilidade, ~R$0,05/msg)
```

#### Arquitetura técnica em 2 fases

**Fase 1 — MVP de validação (Evolution API self-hosted)**
- Solução open source rodando em VPS própria via Docker
- Opera via emulação do WhatsApp Web (não-oficial)
- Custo: R$50–100/mês de servidor, zero por mensagem
- **Risco:** ban da conta do salão pela Meta (viola termos de uso)
- Apropriado para validar o produto, não para escalar

**Fase 2 — Escala (Meta Cloud API oficial)**
- Migração só na camada de configuração do Evolution API (sem reescrita)
- Sem risco de ban, suporte oficial Meta
- Custo estimado por salão: R$15–40/mês
  - Conversa iniciada pelo cliente (janela 24h): **grátis**
  - Lembretes utilidade (~R$0,05/msg)
  - Reengajamento marketing (~R$0,35/msg)

#### Dados já no schema (preservados)

A tabela `agendamentos` tem o enum `origem` com os valores:
- `manual` (em uso)
- `link_publico` (Phase 5)
- **`whatsapp`** (reservado para esta integração futura)

A coluna `saloes.telefone_whatsapp` já existe e é coletada no cadastro.

---

## 📩 Mensagens automáticas (depende do WhatsApp)

Features que dependem do canal WhatsApp:
- Lembrete automático 24h antes do agendamento
- Confirmação de agendamento
- Reengajamento de clientes sem visita há X dias
- Mensagem de aniversário automática

Estas features podem ser **manualmente operadas** pelo dono no MVP (visualizar lista de aniversariantes/clientes parados no dashboard, copiar telefone, abrir WhatsApp manualmente).

Quando a integração for ativada, vira automatizada.

---

## 🗂️ Outras funcionalidades pós-lançamento

### App mobile nativo
- Não está no escopo v1.0
- Mobile web responsivo cobre o caso de uso

### Integração com maquininhas de cartão
- Stripe Terminal / Pagar.me / similares
- Pré-requisito: módulo financeiro maduro

### Sistema de fidelidade / pontos
- Cliente acumula pontos por visita → troca por descontos
- Requer engajamento dos donos para configurar regras

### Emissão de nota fiscal (NF-e / NFC-e)
- Integração com SEFAZ estadual
- Complexo, regulamentado, requer certificado digital A1/A3

---

## Quando retomar

Sinais que indicam é hora de implementar WhatsApp + IA:

1. **Volume de salões** > 50 ativos pagantes (volume justifica investimento)
2. **Solicitação explícita** de pelo menos 30% da base
3. **Concorrente** lançar feature similar e ganhar tração
4. **Custo de IA** cair significativamente (modelos open source maduros)

Até lá, o produto se vende por:
- Agenda inteligente com link público
- Folha de pagamento automatizada (comissão + salário fixo)
- Gestão completa de equipe e comissões
- Controle financeiro real
