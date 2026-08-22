import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlanoKey } from "@/lib/planos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook do AbacatePay — atualiza o estado da assinatura do salão.
 *
 * Segurança em duas camadas (as duas que o AbacatePay oferece):
 *   1. Segredo na query string (?secret=) — comparação em tempo
 *      constante contra ABACATEPAY_WEBHOOK_SECRET
 *   2. HMAC-SHA256 do corpo CRU contra o header X-Webhook-Signature
 *
 * Por isso lemos request.text() e só depois damos JSON.parse — usar
 * request.json() destruiria os bytes originais e quebraria o HMAC.
 *
 * Idempotência: registrar_evento_pagamento() usa UNIQUE(evento_id) e
 * devolve false quando o evento já foi processado — webhook reenviado
 * não altera nada.
 *
 * O webhook não tem sessão de usuário, então escreve via funções
 * SECURITY DEFINER (migration 020) em vez de mexer nas tabelas
 * direto — neste projeto o service_role não tem GRANT nas tabelas
 * públicas (mesmo motivo da migration 016).
 */

// Eventos que alteram o estado da assinatura
const EVENTOS: Record<string, "ativa" | "cancelada"> = {
  "subscription.completed": "ativa",
  "subscription.renewed":   "ativa",
  "subscription.cancelled": "cancelada",
  // Cobrança única — usada quando ABACATEPAY_MODO_AVULSO=1 (conta em
  // modo de teste não cria produto recorrente). Ativa o salão do mesmo
  // jeito, mas não renova sozinho.
  "billing.paid":           "ativa",
};

/** Comparação em tempo constante, segura para tamanhos diferentes */
function seguroIgual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function POST(request: Request) {
  const segredo = process.env.ABACATEPAY_WEBHOOK_SECRET;
  if (!segredo) {
    return NextResponse.json(
      { ok: false, error: "ABACATEPAY_WEBHOOK_SECRET não configurado." },
      { status: 500 },
    );
  }

  // ── Camada 1: segredo na query string ──────────────────────
  const url = new URL(request.url);
  const fornecido = url.searchParams.get("secret") ?? "";
  if (!seguroIgual(fornecido, segredo)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  // Corpo cru — necessário para validar o HMAC
  const raw = await request.text();

  // ── Camada 2: HMAC-SHA256 do corpo ─────────────────────────
  // Só valida quando o header vem preenchido. Assim o endpoint não
  // quebra caso o formato da assinatura mude — mas a camada 1 acima
  // continua obrigatória. Tornar estrito quando confirmado com o
  // suporte do AbacatePay.
  const assinatura = request.headers.get("x-webhook-signature");
  if (assinatura) {
    const esperado = createHmac("sha256", segredo).update(raw).digest("hex");
    if (!seguroIgual(assinatura, esperado)) {
      return NextResponse.json({ ok: false, error: "Assinatura inválida." }, { status: 401 });
    }
  }

  // ── Parse ──────────────────────────────────────────────────
  type Payload = {
    id?:    string;
    event?: string;
    data?: {
      externalId?: string;
      amount?:     number;
      method?:     string;
      subscription?: { id?: string };
      metadata?:   { salao_id?: string; plano?: string };
      // Presente na cobrança avulsa (billing.paid): o id do salão é
      // enviado no externalId do produto
      products?:   { externalId?: string }[];
    };
  };

  let payload: Payload;
  try {
    payload = JSON.parse(raw) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const eventoId = payload.id;
  const evento   = payload.event;
  if (!eventoId || !evento) {
    return NextResponse.json({ ok: false, error: "Payload sem id/event." }, { status: 400 });
  }

  const novoStatus = EVENTOS[evento];
  // Evento que não nos interessa: responde 200 pra não ficar reenviando
  if (!novoStatus) {
    return NextResponse.json({ ok: true, ignorado: evento });
  }

  // Salão vem do externalId (enviado na criação do checkout)
  // Ordem de busca: externalId (assinatura) → metadata → externalId do
  // produto (cobrança avulsa, onde o id do salão vive em products[])
  const salaoId = payload.data?.externalId
    ?? payload.data?.metadata?.salao_id
    ?? payload.data?.products?.[0]?.externalId;
  if (!salaoId) {
    return NextResponse.json({ ok: false, error: "Evento sem externalId." }, { status: 400 });
  }

  const planoBruto = payload.data?.metadata?.plano;
  const plano      = planoBruto && isPlanoKey(planoBruto) ? planoBruto : null;

  // ── Persistência ───────────────────────────────────────────
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json({ ok: false, error: `Admin client: ${String(err)}` }, { status: 500 });
  }

  // Idempotência: false = evento repetido, já processado antes
  const { data: novo, error: regErr } = await admin.rpc("registrar_evento_pagamento", {
    p_evento_id: eventoId,
    p_evento:    evento,
    p_salao_id:  salaoId,
    p_valor:     payload.data?.amount != null ? payload.data.amount / 100 : null,
    p_metodo:    payload.data?.method ?? null,
    p_payload:   payload,
  });

  if (regErr) {
    // 500 faz o AbacatePay reenviar — o que é o desejado aqui
    return NextResponse.json(
      { ok: false, error: `registrar_evento_pagamento: ${regErr.message}` },
      { status: 500 },
    );
  }

  if (novo === false) {
    return NextResponse.json({ ok: true, duplicado: eventoId });
  }

  const { error: updErr } = await admin.rpc("atualizar_assinatura", {
    p_salao_id:      salaoId,
    p_status:        novoStatus,
    p_plano:         plano,
    p_assinatura_id: payload.data?.subscription?.id ?? null,
  });

  if (updErr) {
    return NextResponse.json(
      { ok: false, error: `atualizar_assinatura: ${updErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, evento, status: novoStatus });
}
