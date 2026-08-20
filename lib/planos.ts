/**
 * Fonte única dos planos da Nexa.
 *
 * Usado pela tela de Configurações (assinatura) e pela landing —
 * evita que o preço anunciado divirja do preço cobrado.
 *
 * ⚠️ O valor efetivamente cobrado vive no PRODUTO cadastrado no
 * painel do AbacatePay (o checkout referencia o produto por ID, não
 * envia o valor). Ao mudar um preço aqui, mude também no painel.
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
  },
  profissional: {
    key:              "profissional",
    nome:             "Profissional",
    precoMensal:      99,
    profissionais:    "Até 5 profissionais",
    maxProfissionais: 5,
    descricao:        "Para salões que precisam de equipe, comissões e relatórios.",
    destaque:         true,
  },
  premium: {
    key:              "premium",
    nome:             "Premium",
    precoMensal:      199,
    profissionais:    "Profissionais ilimitados",
    maxProfissionais: Infinity,
    descricao:        "Para salões consolidados com gestão profissional completa.",
    destaque:         false,
  },
};

export const PLANOS_LISTA: Plano[] = [PLANOS.solo, PLANOS.profissional, PLANOS.premium];

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
    case "trial":        return "Seu teste grátis de 30 dias chegou ao fim.";
    case "inadimplente": return "Não conseguimos processar o pagamento da sua assinatura.";
    case "cancelada":    return "Sua assinatura foi cancelada.";
    default:             return "Sua assinatura não está ativa.";
  }
}
