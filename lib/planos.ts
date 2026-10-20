/**
 * Fonte única dos planos da Nexa.
 *
 * Usado pela tela de Configurações (assinatura) e pela landing —
 * evita que o preço anunciado divirja do preço cobrado.
 *
 * Esta é a fonte da verdade do preço: o checkout da Stripe usa
 * `price_data` inline, então mudar um valor aqui já muda o que é
 * cobrado — não há produto a sincronizar em painel nenhum.
 */

export type PlanoKey = "solo" | "profissional" | "premium";

/** Estado da assinatura de um salão (espelha o check da migration 020) */
export type AssinaturaStatus = "trial" | "ativa" | "cancelada" | "inadimplente";

/** Plano gravado no salão — inclui 'trial', que não é assinável */
export type PlanoSalao = PlanoKey | "trial";

export type Plano = {
  key:             PlanoKey;
  nome:            string;
  precoMensal:     number;         // R$/mês
  profissionais:   string;         // texto exibido
  maxProfissionais: number;        // Infinity = ilimitado (ainda não aplicado)
  descricao:       string;
  destaque:        boolean;        // "Mais popular"
  beneficios:      string[];       // exibidos nos cards de plano
};

export const PLANOS: Record<PlanoKey, Plano> = {
  solo: {
    key:              "solo",
    nome:             "Solo",
    precoMensal:      49,
    profissionais:    "1 profissional",
    maxProfissionais: 1,
    descricao:        "Para autônomas que querem organizar a agenda e ter link público.",
    destaque:         false,
    beneficios: [
      "Agenda completa",
      "Link público de agendamento",
      "Cadastro de clientes",
      "Controle de estoque",
      "Lembrete por e-mail",
    ],
  },
  profissional: {
    key:              "profissional",
    nome:             "Profissional",
    precoMensal:      99,
    profissionais:    "Até 5 profissionais",
    maxProfissionais: 5,
    descricao:        "Para salões que precisam de equipe, comissões e relatórios.",
    destaque:         true,
    beneficios: [
      "Tudo do plano Solo",
      "Equipe com comissões",
      "Folha de pagamento em PDF",
      "Faturamento e lucro",
      "Ranking e carga horária",
    ],
  },
  premium: {
    key:              "premium",
    nome:             "Premium",
    precoMensal:      199,
    profissionais:    "Profissionais ilimitados",
    maxProfissionais: Infinity,
    descricao:        "Para salões consolidados com gestão profissional completa.",
    destaque:         false,
    beneficios: [
      "Tudo do plano Profissional",
      "Profissionais ilimitados",
      "Controle de despesas",
      "Despesas fixas recorrentes",
      "Suporte prioritário",
    ],
  },
};

export const PLANOS_LISTA: Plano[] = [PLANOS.solo, PLANOS.profissional, PLANOS.premium];

// ─── Recursos por plano (gating) ───────────────────────────
//
// Derivado dos benefícios anunciados na landing — a mesma fonte que
// o cliente lê antes de assinar. Cada tela protegida declara o plano
// MÍNIMO que a inclui; os planos são cumulativos (Premium ⊇
// Profissional ⊇ Solo), então basta a ordem abaixo.
//
// Mudar um recurso de plano aqui muda o acesso em todo o app de uma
// vez — sidebar, guarda de página e aviso de upgrade leem daqui.

/** Ordem de poder dos planos. Índice maior = inclui os menores. */
export const ORDEM_PLANOS: PlanoKey[] = ["solo", "profissional", "premium"];

/** Rotas protegidas e o plano mínimo que as libera. */
export const PLANO_MINIMO_ROTA: Record<string, PlanoKey> = {
  // Base — todo plano (inclusive Solo) tem:
  "/dashboard":       "solo",
  "/agenda":          "solo",
  "/clientes":        "solo",
  "/servicos":        "solo",
  "/profissionais":   "solo",   // liberada, mas com limite de equipe (ver maxProfissionais)
  "/configuracoes":   "solo",

  "/estoque":         "solo",   // estoque entra já no Solo

  // Profissional em diante (equipe, relatórios, financeiro):
  "/carga-horaria":   "profissional",
  "/ranking":         "profissional",
  "/folha-pagamento": "profissional",
  "/financeiro":      "profissional",   // vê faturamento e lucro…
};

/**
 * Despesas (lançar e as recorrentes) são exclusivas do Premium. O
 * Profissional abre o Financeiro e vê faturamento, folha e lucro, mas
 * não gerencia despesas. Mantido separado do mapa de rotas porque é
 * um gating DENTRO de uma página, não da página inteira.
 */
export function planoPermiteDespesas(plano: PlanoSalao): boolean {
  return planoEfetivo(plano) === "premium";
}

/**
 * Plano efetivo para fins de gating. Durante o trial, o salão guarda
 * em `plano` o que escolheu no cadastro; se por algum motivo vier
 * 'trial' (contas antigas), cai no mínimo para não liberar de graça.
 */
export function planoEfetivo(plano: PlanoSalao): PlanoKey {
  return isPlanoKey(plano) ? plano : "solo";
}

/** true se `plano` alcança o `exigido` (cumulativo). */
export function planoAlcanca(plano: PlanoKey, exigido: PlanoKey): boolean {
  return ORDEM_PLANOS.indexOf(plano) >= ORDEM_PLANOS.indexOf(exigido);
}

/**
 * O salão (pelo plano) pode acessar a rota?
 * Rota não listada é livre (ex.: páginas públicas, /clientes/novo…
 * herdam da raiz pelo prefixo).
 */
export function planoPermiteRota(plano: PlanoSalao, rota: string): boolean {
  const exigido = planoMinimoDaRota(rota);
  return exigido === null || planoAlcanca(planoEfetivo(plano), exigido);
}

/** Plano mínimo da rota, casando pelo prefixo mais específico. */
export function planoMinimoDaRota(rota: string): PlanoKey | null {
  // Casa o prefixo mais longo: /clientes/novo usa a regra de /clientes
  const chaves = Object.keys(PLANO_MINIMO_ROTA).sort((a, b) => b.length - a.length);
  for (const base of chaves) {
    if (rota === base || rota.startsWith(base + "/")) return PLANO_MINIMO_ROTA[base];
  }
  return null;
}

/** Limite de profissionais do plano (Infinity = ilimitado). */
export function limiteProfissionais(plano: PlanoSalao): number {
  return PLANOS[planoEfetivo(plano)].maxProfissionais;
}

/** Menor plano que inclui a rota — para a mensagem "faça upgrade para X". */
export function planoNecessarioParaRota(rota: string): Plano | null {
  const chave = planoMinimoDaRota(rota);
  return chave ? PLANOS[chave] : null;
}

/** Dias de teste grátis (espelha o default de saloes.trial_termina_em) */
export const TRIAL_DIAS = 30;

export function isPlanoKey(v: string): v is PlanoKey {
  return v === "solo" || v === "profissional" || v === "premium";
}

/** Dias restantes de trial (0 se já acabou) */
export function diasRestantes(trialTerminaEm: string): number {
  const ms = new Date(trialTerminaEm).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export const LABEL_STATUS: Record<AssinaturaStatus, string> = {
  trial:        "Teste grátis",
  ativa:        "Ativa",
  cancelada:    "Cancelada",
  inadimplente: "Pagamento pendente",
};

// ─── Controle de acesso ────────────────────────────────────

/**
 * Dias de tolerância após uma falha de pagamento antes de bloquear.
 *
 * Existe porque falha de cartão costuma ser temporária (limite, cartão
 * vencido) — cortar o acesso de quem já paga, na hora, é pior que
 * esperar alguns dias. Também protege contra webhook que chegou
 * errado: dá tempo de perceber antes de travar um cliente legítimo.
 */
export const GRACA_DIAS = 3;

export type EstadoAssinatura = {
  assinatura_status:        AssinaturaStatus;
  trial_termina_em:         string;
  assinatura_atualizada_em: string | null;
};

/**
 * Regra única de bloqueio do app — usada pelo layout autenticado.
 *
 *   ativa         → nunca bloqueia
 *   trial         → bloqueia depois que o teste grátis vence
 *   inadimplente  → bloqueia após o período de graça
 *   cancelada     → bloqueia
 */
export function acessoBloqueado(s: EstadoAssinatura): boolean {
  const agora = Date.now();

  switch (s.assinatura_status) {
    case "ativa":
      return false;

    case "trial":
      return new Date(s.trial_termina_em).getTime() < agora;

    case "inadimplente": {
      // Sem data de referência, é mais seguro liberar do que travar
      if (!s.assinatura_atualizada_em) return false;
      const limite = new Date(s.assinatura_atualizada_em).getTime()
                   + GRACA_DIAS * 86_400_000;
      return limite < agora;
    }

    case "cancelada":
      return true;
  }
}

/** Motivo do bloqueio, para a mensagem exibida ao usuário */
export function motivoBloqueio(s: EstadoAssinatura): string {
  switch (s.assinatura_status) {
    case "trial":        return `Seu teste grátis de ${TRIAL_DIAS} dias chegou ao fim.`;
    case "inadimplente": return "Não conseguimos processar o pagamento da sua assinatura.";
    case "cancelada":    return "Sua assinatura foi cancelada.";
    default:             return "Sua assinatura não está ativa.";
  }
}

// ─── Aviso de renovação (faixa no dashboard) ───────────────

/** A partir de quantos dias restantes o aviso começa a aparecer */
const AVISO_INFO_DIAS    = 7;
/** A partir de quantos dias restantes o aviso fica urgente */
const AVISO_ATENCAO_DIAS = 3;

export type NivelAviso = "info" | "atencao" | "critico";

export type Aviso = {
  nivel:  NivelAviso;
  titulo: string;
  texto:  string;
  cta:    string;
};

/**
 * Aviso progressivo mostrado no dashboard. Retorna `null` quando não
 * há nada a dizer — assinatura ativa ou trial ainda folgado — para a
 * faixa não virar ruído permanente.
 *
 * Os casos `critico` só alcançam quem NÃO está bloqueado (ex.:
 * inadimplente dentro do período de graça); quem está bloqueado sequer
 * chega ao dashboard. Ainda assim são cobertos aqui para manter esta
 * função como fonte única do estado da assinatura.
 */
export function avisoAssinatura(s: EstadoAssinatura): Aviso | null {
  const cta = "Ver planos";

  switch (s.assinatura_status) {
    case "ativa":
      return null;

    case "trial": {
      const dias = diasRestantes(s.trial_termina_em);

      if (dias > AVISO_INFO_DIAS) return null;

      if (dias === 0) {
        return {
          nivel:  "critico",
          titulo: "Seu teste grátis terminou",
          texto:  "Escolha um plano para continuar usando a Nexa.",
          cta,
        };
      }

      const plural = dias === 1 ? "dia" : "dias";
      return dias <= AVISO_ATENCAO_DIAS
        ? {
            nivel:  "atencao",
            titulo: `Faltam ${dias} ${plural} de teste grátis`,
            texto:  "Escolha um plano para não perder o acesso ao sistema.",
            cta,
          }
        : {
            nivel:  "info",
            titulo: `Seu teste grátis termina em ${dias} ${plural}`,
            texto:  "Assine quando quiser — seus dados continuam salvos.",
            cta,
          };
    }

    case "inadimplente": {
      // Quantos dias ainda restam da tolerância antes do bloqueio
      const base = s.assinatura_atualizada_em
        ? new Date(s.assinatura_atualizada_em).getTime() + GRACA_DIAS * 86_400_000
        : null;
      const restantes = base
        ? Math.max(0, Math.ceil((base - Date.now()) / 86_400_000))
        : GRACA_DIAS;

      return {
        nivel:  "critico",
        titulo: "Não conseguimos processar seu pagamento",
        texto:  restantes > 0
          ? `Regularize em até ${restantes} ${restantes === 1 ? "dia" : "dias"} para manter o acesso.`
          : "Regularize para manter o acesso ao sistema.",
        cta:    "Regularizar",
      };
    }

    case "cancelada":
      return {
        nivel:  "critico",
        titulo: "Sua assinatura foi cancelada",
        texto:  "Reative um plano para continuar usando a Nexa.",
        cta:    "Reativar",
      };
  }
}

// ─── Periodicidade da assinatura ───────────────────────────

export type Periodicidade = "mensal" | "semestral" | "anual";

/**
 * Desconto por compromisso maior. O anual equivale a pagar ~9,6 meses
 * pelos 12 — vale o desconto porque antecipa o caixa e reduz o churn
 * (o cliente não cancela no segundo mês).
 */
export const PERIODOS: {
  key: Periodicidade;
  label: string;
  meses: number;
  desconto: number;   // 0 a 1
  selo?: string;
}[] = [
  { key: "mensal",    label: "Mensal",    meses: 1,  desconto: 0    },
  { key: "semestral", label: "Semestral", meses: 6,  desconto: 0.05, selo: "-5%"  },
  { key: "anual",     label: "Anual",     meses: 12, desconto: 0.20, selo: "-20%" },
];

export function isPeriodicidade(v: string): v is Periodicidade {
  return v === "mensal" || v === "semestral" || v === "anual";
}

export function periodoInfo(p: Periodicidade) {
  return PERIODOS.find((x) => x.key === p) ?? PERIODOS[0]!;
}

/** Valor total cobrado de uma vez, já com desconto (arredondado ao real) */
export function precoPeriodo(plano: Plano, p: Periodicidade): number {
  const { meses, desconto } = periodoInfo(p);
  return Math.round(plano.precoMensal * meses * (1 - desconto));
}

/** Quanto sai por mês naquele período — é o número que o cliente compara */
export function precoPorMes(plano: Plano, p: Periodicidade): number {
  return precoPeriodo(plano, p) / periodoInfo(p).meses;
}

/** Economia total em reais frente a pagar mês a mês (0 no mensal) */
export function economia(plano: Plano, p: Periodicidade): number {
  const { meses } = periodoInfo(p);
  return plano.precoMensal * meses - precoPeriodo(plano, p);
}
