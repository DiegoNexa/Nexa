# Diagrama do Sistema — Nexa

> Mapa completo da arquitetura. Atualizado a cada mudança estrutural.
> Visualize com `Ctrl+Shift+V` no VS Code (extensão: Markdown Preview Mermaid Support).

---

## 1. Visão Geral do Sistema

```mermaid
flowchart TD
    subgraph CLIENT["Clientes do Salão"]
        LP[Link Público\nnexa.com.br/agendar/slug]
    end

    subgraph OWNER["Dono / Profissional"]
        DB[Dashboard Nexa\nnavegador]
    end

    subgraph APP["Next.js — Nexa App"]
        UI[Interface Web]
        API[API Routes]
        PDF[Geração de PDFs\nreact-pdf]
    end

    subgraph DATA["Dados"]
        SB[(Supabase\nPostgres + RLS)]
    end

    LP -->|agendamento online| UI
    DB -->|gestão completa| UI
    UI --> API
    API --> SB
    UI -->|baixar folha| PDF
```

> **Pós-lançamento:** integração com WhatsApp + IA via Evolution API + OpenAI GPT.
> Plano técnico completo em [`ROADMAP.md`](ROADMAP.md). Não está em v1.0.

---

## 2. Rotas do App (Next.js App Router)

```mermaid
flowchart TD
    ROOT["/"]

    ROOT --> AUTH["(auth)"]
    ROOT --> DASH["(dashboard)"]
    ROOT --> PUB["(público)"]

    AUTH --> LOGIN["/login"]
    AUTH --> REGISTER["/cadastro"]

    PUB --> BOOKING["/agendar/[slug]\nAgendamento público\nsem login"]

    DASH --> DASHBOARD["/dashboard\nResumo do dia"]
    DASH --> AGENDA["/agenda\nCalendário"]
    DASH --> CLIENTES["/clientes\nLista de clientes"]
    DASH --> PROFISSIONAIS["/profissionais\nGestão de equipe"]
    DASH --> ESTOQUE["/estoque\nControle de produtos"]
    DASH --> FINANCEIRO["/financeiro\nReceitas e despesas"]
    DASH --> CONFIG["/configuracoes\nPerfil e preferências"]

    AGENDA --> AGENDAID["/agenda/[id]\nDetalhe do agendamento"]
    CLIENTES --> CLIENTEID["/clientes/[id]\nHistórico do cliente"]
    PROFISSIONAIS --> PROFID["/profissionais/[id]\nPerfil e comissões"]

    ROOT --> APIROUTES["API Routes"]
    APIROUTES --> API_AGE["/api/agendamentos"]
    APIROUTES --> API_CLI["/api/clientes"]
    APIROUTES --> API_PRO["/api/profissionais"]
    APIROUTES --> API_EST["/api/estoque"]
    APIROUTES --> API_FIN["/api/financeiro"]
    APIROUTES --> API_PDF["/api/folha-pagamento/[id]/pdf\nGera PDF da folha"]
```

---

## 3. Árvore de Componentes

```mermaid
flowchart TD
    APP[app/layout.tsx\nProviders + Auth]

    APP --> AUTHLAYOUT["(auth)/layout.tsx"]
    APP --> DASHLAYOUT["(dashboard)/layout.tsx\nSidebar + Header"]
    APP --> PUBLAYOUT["(público)/layout.tsx\nSem navegação"]

    DASHLAYOUT --> C_DASH["Dashboard\nResumo · Próximos · Alertas"]
    DASHLAYOUT --> C_AGE["Agenda\nCalendarView\nAppointmentCard\nAppointmentModal\nStatusBadge"]
    DASHLAYOUT --> C_CLI["Clientes\nClienteList\nClienteForm\nClienteHistorico\nRetentionAlert"]
    DASHLAYOUT --> C_PRO["Profissionais\nProfissionalList\nProfissionalForm\nCargoHorariaForm\nComissaoConfig"]
    DASHLAYOUT --> C_EST["Estoque\nProdutoList\nProdutoForm\nStockAlert"]
    DASHLAYOUT --> C_FIN["Financeiro\nReceitasList\nDespesaForm\nComissaoReport\nPeriodReport"]
    DASHLAYOUT --> C_CFG["Configurações\nPerfilSalao\nPreferências"]

    PUBLAYOUT --> C_PUB["AgendamentoPublico\nServicoSelector\nProfissionalSelector\nHorarioSelector\nConfirmacao"]
```

---

## 4. Fluxo WhatsApp com IA (🔮 pós-lançamento — não implementado)

> Esta seção descreve a integração **planejada para depois do v1.0**.
> Veja [`ROADMAP.md`](ROADMAP.md) para custo operacional, fases e gatilhos
> que determinam quando retomar.

```mermaid
sequenceDiagram
    actor Cliente
    participant WA as WhatsApp
    participant EVO as Evolution API
    participant GPT as OpenAI GPT
    participant API as Nexa API
    participant DB as Supabase

    Cliente->>WA: "Quero cortar o cabelo\nsexta às 14h com a Ana"
    WA->>EVO: mensagem recebida
    EVO->>GPT: envia contexto + mensagem
    GPT-->>EVO: extrai serviço, profissional, data/hora
    EVO->>API: POST /api/whatsapp/webhook
    API->>DB: verifica disponibilidade
    DB-->>API: slot disponível
    API->>DB: cria agendamento (origem: whatsapp)
    DB-->>API: agendamento criado
    API-->>EVO: confirma criação
    EVO->>WA: "Agendado! Sexta 14h com Ana.\nVocê receberá um lembrete."
    WA->>Cliente: mensagem de confirmação

    Note over API,DB: 24h antes do horário
    API->>EVO: dispara lembrete (utilidade)
    EVO->>WA: "Lembrete: amanhã 14h com Ana"
    WA->>Cliente: lembrete automático
```

---

## 5. Fluxo de Agendamento Público

```mermaid
flowchart LR
    A[Cliente acessa\nnexa.com.br/agendar/slug] --> B[Escolhe serviço]
    B --> C[Escolhe profissional]
    C --> D[Escolhe data e horário\ndisponíveis]
    D --> E[Informa nome\ne telefone]
    E --> F{Confirma}
    F -->|sim| G[Agendamento criado\norigem: link_publico]
    G --> H[Confirmação na tela\n+ email opcional]
    F -->|não| D
```

---

## 6. Multi-tenant — Isolamento de Dados

```mermaid
flowchart TD
    LOGIN[Usuário faz login] --> JWT[Supabase gera JWT\ncom salao_id]
    JWT --> RLS[Row Level Security\nativa no Postgres]
    RLS --> Q1[SELECT * FROM clientes\nWHERE salao_id = auth.salao_id]
    RLS --> Q2[SELECT * FROM agendamentos\nWHERE salao_id = auth.salao_id]
    RLS --> Q3[SELECT * FROM produtos\nWHERE salao_id = auth.salao_id]

    style RLS fill:#f0f4ff,stroke:#4f6ef7
    note["Cada query é filtrada\nautomaticamente pelo RLS.\nNenhum salão vê dados\nde outro."]
```

---

## 7. Schema do Banco de Dados

```mermaid
erDiagram
    saloes {
        uuid id PK
        string nome
        string slug
        string telefone_whatsapp
        timestamp created_at
    }

    usuarios {
        uuid id PK
        uuid salao_id FK
        string email
        string role
    }

    profissionais {
        uuid id PK
        uuid salao_id FK
        uuid usuario_id FK
        string nome
        string telefone
        string cor
        decimal comissao_padrao
        decimal salario_fixo
        boolean ativo
        timestamp created_at
    }

    carga_horaria {
        uuid id PK
        uuid profissional_id FK
        int dia_semana
        time hora_inicio
        time hora_fim
    }

    clientes {
        uuid id PK
        uuid salao_id FK
        string nome
        string telefone
        string email
        date data_nascimento
        text observacoes
        timestamp ultima_visita
        boolean ativo
        timestamp created_at
    }

    servicos {
        uuid id PK
        uuid salao_id FK
        string nome
        text descricao
        int duracao_minutos
        decimal preco
        boolean ativo
        timestamp created_at
    }

    comissoes_config {
        uuid id PK
        uuid profissional_id FK
        uuid servico_id FK
        decimal percentual
        boolean atende
    }

    agendamentos {
        uuid id PK
        uuid salao_id FK
        uuid cliente_id FK
        uuid profissional_id FK
        uuid servico_id FK
        timestamp data_hora_inicio
        timestamp data_hora_fim
        string status
        string origem
        text observacoes
        uuid created_by FK
        timestamp created_at
    }

    produtos {
        uuid id PK
        uuid salao_id FK
        string nome
        int quantidade_atual
        int quantidade_minima
        timestamp created_at
    }

    consumo_produtos {
        uuid id PK
        uuid agendamento_id FK
        uuid produto_id FK
        int quantidade
    }

    despesas {
        uuid id PK
        uuid salao_id FK
        string descricao
        decimal valor
        string categoria
        date data
        timestamp created_at
    }

    movimentos_folha {
        uuid id PK
        uuid profissional_id FK
        string tipo
        decimal valor
        text descricao
        date data_movimento
        uuid created_by FK
        timestamp created_at
    }

    produtos {
        uuid id PK
        uuid salao_id FK
        string nome
        text descricao
        string unidade
        decimal quantidade
        decimal quantidade_minima
        decimal preco_custo
        boolean ativo
        timestamp created_at
    }

    movimentos_estoque {
        uuid id PK
        uuid produto_id FK
        string tipo
        decimal quantidade
        text motivo
        uuid created_by FK
        timestamp created_at
    }

    saloes ||--o{ usuarios : ""
    saloes ||--o{ profissionais : ""
    saloes ||--o{ clientes : ""
    saloes ||--o{ servicos : ""
    saloes ||--o{ agendamentos : ""
    saloes ||--o{ produtos : ""
    saloes ||--o{ despesas : ""
    profissionais ||--o{ carga_horaria : ""
    profissionais ||--o{ comissoes_config : ""
    profissionais ||--o{ agendamentos : ""
    clientes ||--o{ agendamentos : ""
    servicos ||--o{ comissoes_config : ""
    servicos ||--o{ agendamentos : ""
    agendamentos ||--o{ consumo_produtos : ""
    produtos ||--o{ consumo_produtos : ""
    produtos ||--o{ movimentos_estoque : ""
```

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| `PK` | Chave primária |
| `FK` | Chave estrangeira |
| `RLS` | Row Level Security — isolamento automático por salão |
| `slug` | Identificador único do salão na URL pública |
| `origem` | `manual` · `whatsapp` · `link_publico` |
| `status` | `agendado` · `confirmado` · `concluido` · `cancelado` · `falta` |
| `role` | `dono` · `profissional` |
