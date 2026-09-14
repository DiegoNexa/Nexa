/**
 * Extrai de um evento da Stripe o que o webhook precisa: qual salão,
 * qual plano, qual assinatura e quanto foi cobrado.
 *
 * Fica separado da rota para ser testável sem servidor e sem SDK: não
 * tem import de runtime e recebe o evento cru.
 *
 * POR QUE TANTOS CAMINHOS — o lugar da metadata depende do tipo de
 * objeto e mudou entre versões da API. Na linha "dahlia" (a do SDK):
 *
 *   checkout.session → metadata.salao_id (e client_reference_id)
 *                      subscription = "sub_…"
 *   invoice          → parent.subscription_details.metadata.salao_id
 *                      parent.subscription_details.subscription = "sub_…"
 *                      (invoice.subscription e invoice.subscription_details
 *                       NÃO existem mais no topo)
 *   subscription     → metadata.salao_id, id = "sub_…"
 *
 * Bug corrigido aqui: a versão anterior só conhecia o formato antigo da
 * invoice. Em invoice.paid e invoice.payment_failed o salão não era
 * encontrado, então um cartão recusado na renovação nunca marcava o
 * salão como inadimplente — ele seguia usando o app sem pagar.
 * Descoberto testando a lógica contra eventos reais em 14/09/2026.
 */

type Registro = Record<string, unknown>;

export type VinculoEvento = {
  salaoId:      string | null;
  plano:        string | null;   // cru — a rota valida com isPlanoKey
  assinaturaId: string | null;   // sempre "sub_…" ou null, nunca id de invoice
  centavos:     number | null;
};

function registro(v: unknown): Registro | null {
  return v !== null && typeof v === "object" ? (v as Registro) : null;
}

function texto(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** A assinatura pode vir como "sub_…" ou como objeto expandido */
function idDe(v: unknown): string | null {
  return texto(v) ?? texto(registro(v)?.id);
}

export function extrairVinculo(evento: { type: string; data: { object: unknown } }): VinculoEvento {
  const o    = registro(evento.data.object) ?? {};
  const tipo = texto(o.object);

  const detalhes = registro(registro(o.parent)?.subscription_details);
  const linhas   = registro(o.lines)?.data;

  // Ordem de preferência. O formato antigo (subscription_details no
  // topo) fica por último, só para endpoint com versão de API antiga.
  const fontes: (Registro | null)[] = [
    registro(o.metadata),
    registro(detalhes?.metadata),
    Array.isArray(linhas)
      ? linhas.map((l) => registro(registro(l)?.metadata)).find((m) => texto(m?.salao_id)) ?? null
      : null,
    registro(registro(o.subscription_details)?.metadata),
  ];

  const salaoId =
    fontes.map((m) => texto(m?.salao_id)).find((v) => v !== null) ??
    texto(o.client_reference_id);

  const plano = fontes.map((m) => texto(m?.plano)).find((v) => v !== null) ?? null;

  const assinaturaId =
    tipo === "subscription"
      ? texto(o.id)
      : idDe(o.subscription) ?? idDe(detalhes?.subscription);

  let centavos: number | null = null;
  if (typeof o.amount_total === "number") {
    centavos = o.amount_total;                       // checkout.session
  } else if (tipo === "invoice") {
    // Na falha nada foi pago: o valor relevante é o que era devido
    const valor = evento.type === "invoice.payment_failed" ? o.amount_due : o.amount_paid;
    centavos = typeof valor === "number" ? valor : null;
  }

  return { salaoId: salaoId ?? null, plano, assinaturaId, centavos };
}
