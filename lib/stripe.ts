/**
 * Integração de cobrança com a Stripe.
 *
 * Substituiu o AbacatePay: a API deles divergia da documentação em
 * vários pontos (evento inexistente, `externalId` interpretado como
 * cliente, produto recorrente indisponível em modo de teste), o que
 * custou muitas horas de tentativa e erro.
 *
 * Usa o SDK oficial — a verificação de assinatura do webhook tem um
 * esquema próprio (timestamp + v1) que é fácil de errar à mão.
 *
 * Env vars:
 *   - STRIPE_SECRET_KEY      (obrigatório) — sk_test_... ou sk_live_...
 *   - STRIPE_WEBHOOK_SECRET  (usado pelo webhook, não aqui)
 */

import Stripe from "stripe";
import { PLANOS, periodoInfo, precoPeriodo, type PlanoKey, type Periodicidade } from "./planos";

/**
 * Métodos de pagamento aceitos.
 *
 * Só cartão por enquanto: PIX na Stripe exige ativação à parte para
 * contas brasileiras. Depois de ativado no painel, basta acrescentar
 * "pix" aqui — mas atenção, PIX **não** funciona em `mode: subscription`
 * (não há débito recorrente), então a cobrança teria que virar avulsa.
 */
const METODOS: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = ["card"];

let cliente: Stripe | null = null;

/** Instância única, criada sob demanda para o build não exigir a chave */
function stripe(): Stripe {
  if (!cliente) {
    const chave = process.env.STRIPE_SECRET_KEY;
    if (!chave) throw new Error("STRIPE_SECRET_KEY não configurada.");
    cliente = new Stripe(chave);
  }
  return cliente;
}

export type CheckoutResultado =
  | { ok: true;  url: string; id: string }
  | { ok: false; error: string };

type CriarCheckoutParams = {
  plano:   PlanoKey;
  periodo: Periodicidade;
  salaoId: string;   // vai na metadata — é o que amarra o webhook ao salão
  baseUrl: string;   // origem da aplicação, para as URLs de retorno
  email?:  string;   // pré-preenche o checkout, quando disponível
};

/**
 * Cria a sessão de checkout da assinatura mensal.
 *
 * O preço vai inline (`price_data`), então NÃO é preciso cadastrar
 * produto nem preço no painel da Stripe — a fonte da verdade continua
 * sendo lib/planos.ts.
 */
export async function criarCheckoutAssinatura(
  p: CriarCheckoutParams,
): Promise<CheckoutResultado> {
  const plano = PLANOS[p.plano];
  const info  = periodoInfo(p.periodo);

  // Stripe só tem interval month/year: semestral vira 6 meses.
  const recurring: { interval: "month" | "year"; interval_count?: number } =
    p.periodo === "anual"
      ? { interval: "year" }
      : { interval: "month", interval_count: info.meses };

  try {
    const sessao = await stripe().checkout.sessions.create({
      mode:                 "subscription",
      payment_method_types: METODOS,
      locale:               "pt-BR",
      customer_email:       p.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency:    "brl",
          unit_amount: precoPeriodo(plano, p.periodo) * 100,
          recurring,
          product_data: {
            name:        `Nexa ${plano.nome} · ${info.label}`,
            description: plano.descricao,
          },
        },
      }],
      success_url: `${p.baseUrl}/configuracoes?assinatura=ok`,
      cancel_url:  `${p.baseUrl}/assinatura`,
      // Duas vias para o webhook achar o salão: a sessão e a assinatura
      // criada a partir dela (a renovação só carrega a da assinatura).
      client_reference_id: p.salaoId,
      metadata:            { salao_id: p.salaoId, plano: p.plano, periodo: p.periodo },
      subscription_data: {
        metadata: { salao_id: p.salaoId, plano: p.plano, periodo: p.periodo },
      },
    });

    if (!sessao.url) {
      return { ok: false, error: "A Stripe não devolveu a URL de checkout." };
    }
    return { ok: true, url: sessao.url, id: sessao.id };
  } catch (err) {
    const msg = err instanceof Stripe.errors.StripeError
      ? err.message
      : String(err);
    return { ok: false, error: `Stripe: ${msg}` };
  }
}

/** Cliente cru, para o webhook validar a assinatura do evento */
export function stripeClient(): Stripe {
  return stripe();
}
