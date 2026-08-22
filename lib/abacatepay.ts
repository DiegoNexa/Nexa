/**
 * Cliente da API do AbacatePay (cobrança de assinaturas).
 *
 * Não usa SDK — fetch direto, mesmo padrão de lib/email.ts (Resend).
 *
 * Env vars:
 *   - ABACATEPAY_API_KEY        (obrigatório) — segredo de servidor
 *   - ABACATEPAY_WEBHOOK_SECRET (usado pelo webhook, não aqui)
 *   - ABACATEPAY_MODO_AVULSO    (opcional) — ver "modo avulso" abaixo
 *
 * ⚠️ ANTES DE LANÇAR — confirmar com o AbacatePay:
 *   1. Se a assinatura recorrente aceita PIX. A doc de
 *      /subscriptions/create diz que `methods` só suporta CARD,
 *      mas a página comercial anuncia recorrência via PIX
 *      (R$0,80/parcela). Se confirmarem PIX, basta incluir "PIX"
 *      em METODOS_ASSINATURA abaixo.
 *   2. Se a recorrência PIX é automática (PIX Automático) ou se o
 *      cliente precisa pagar manualmente a cada ciclo — o segundo
 *      caso aumenta muito o churn involuntário.
 */

import { PLANOS, type PlanoKey } from "./planos";

const API_BASE = "https://api.abacatepay.com/v1";

/**
 * MODO AVULSO (teste)
 *
 * Contas em modo de teste do AbacatePay não conseguem criar produtos
 * recorrentes. Com ABACATEPAY_MODO_AVULSO=1 a cobrança passa a ser
 * ÚNICA (/billing/create) em vez de assinatura (/subscriptions/create).
 *
 * Vantagem: o produto é montado aqui a partir de lib/planos.ts, então
 * NÃO é preciso cadastrar produto nenhum no painel — os IDs
 * ABACATEPAY_PRODUTO_* ficam dispensados.
 *
 * Serve para validar o fluxo ponta a ponta (checkout → pagamento →
 * webhook → desbloqueio do salão). NÃO renova sozinho: ao voltar para
 * produção, remova a env var e cadastre os produtos MONTHLY.
 */
const MODO_AVULSO = process.env.ABACATEPAY_MODO_AVULSO === "1";

/**
 * Métodos aceitos na assinatura. Começa só com CARD porque é o
 * único garantido pela documentação para cobrança recorrente
 * automática. Vire ["PIX", "CARD"] quando o suporte confirmar.
 */
const METODOS_ASSINATURA = ["CARD"];

/** No modo avulso o PIX é liberado (não depende de recorrência) */
const METODOS_AVULSO = ["PIX"];

/**
 * ID do produto de cada plano no painel do AbacatePay.
 * Os produtos precisam ser criados com ciclo MONTHLY e com o mesmo
 * preço de lib/planos.ts — o checkout referencia o produto por ID e
 * o valor cobrado vem de lá.
 *
 * Ignorado quando MODO_AVULSO está ligado.
 */
const PRODUTO_ID: Record<PlanoKey, string | undefined> = {
  solo:         process.env.ABACATEPAY_PRODUTO_SOLO,
  profissional: process.env.ABACATEPAY_PRODUTO_PROFISSIONAL,
  premium:      process.env.ABACATEPAY_PRODUTO_PREMIUM,
};

type CheckoutResultado =
  | { ok: true;  url: string; id: string }
  | { ok: false; error: string };

type CriarCheckoutParams = {
  plano:      PlanoKey;
  salaoId:    string;   // vira externalId — é o que amarra o webhook ao salão
  baseUrl:    string;   // origem da aplicação, para montar as URLs de retorno
};

export async function criarCheckoutAssinatura(
  p: CriarCheckoutParams,
): Promise<CheckoutResultado> {
  const apiKey = process.env.ABACATEPAY_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "ABACATEPAY_API_KEY não configurada." };
  }

  const retorno = `${p.baseUrl}/configuracoes`;
  const plano   = PLANOS[p.plano];

  // Metadados iguais nos dois modos — o webhook lê daqui
  const metadata = { salao_id: p.salaoId, plano: p.plano };

  let endpoint: string;
  let corpo: Record<string, unknown>;

  if (MODO_AVULSO) {
    // Cobrança única: o produto é declarado aqui (preço em centavos),
    // sem depender de nada cadastrado no painel.
    endpoint = `${API_BASE}/billing/create`;
    corpo = {
      frequency:  "ONE_TIME",
      methods:    METODOS_AVULSO,
      products: [{
        externalId:  p.salaoId,          // fallback do webhook para achar o salão
        name:        `Nexa ${plano.nome}`,
        description: plano.descricao,
        quantity:    1,
        price:       Math.round(plano.precoMensal * 100),
      }],
      externalId:    p.salaoId,
      returnUrl:     retorno,
      completionUrl: retorno,
      metadata,
    };
  } else {
    const produtoId = PRODUTO_ID[p.plano];
    if (!produtoId) {
      return {
        ok: false,
        error: `Produto do plano "${p.plano}" não configurado no AbacatePay.`,
      };
    }

    endpoint = `${API_BASE}/subscriptions/create`;
    corpo = {
      items:         [{ id: produtoId, quantity: 1 }],
      methods:       METODOS_ASSINATURA,
      externalId:    p.salaoId,
      returnUrl:     retorno,   // usuário desistiu / voltou
      completionUrl: retorno,   // pagamento concluído
      metadata,
    };
  }

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${apiKey}`,
      },
      body: JSON.stringify(corpo),
    });
  } catch (err) {
    return { ok: false, error: `Falha de rede: ${String(err)}` };
  }

  const texto = await res.text();

  if (!res.ok) {
    return { ok: false, error: `AbacatePay HTTP ${res.status}: ${texto.slice(0, 200)}` };
  }

  // Formato padrão da API: { data, error, success }
  let json: { data?: { id?: string; url?: string }; error?: unknown };
  try {
    json = JSON.parse(texto);
  } catch {
    return { ok: false, error: "Resposta inválida do AbacatePay." };
  }

  const url = json.data?.url;
  const id  = json.data?.id;
  if (!url || !id) {
    return { ok: false, error: `Resposta sem URL de checkout: ${texto.slice(0, 200)}` };
  }

  return { ok: true, url, id };
}
