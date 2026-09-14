import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeClient } from "@/lib/stripe";
import { isPlanoKey } from "@/lib/planos";
import { extrairVinculo } from "@/lib/stripe-evento";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook da Stripe — mantém saloes.assinatura_status em dia.
 *
 * Autenticação: assinatura do header `stripe-signature`, verificada
 * pelo SDK (`constructEvent`). Diferente do endpoint anterior, aqui
 * NÃO há segredo na query string: a assinatura da Stripe é
 * documentada e confiável, então é a única camada necessária.
 *
 * Escreve via funções SECURITY DEFINER (migration 020) em vez de
 * mexer nas tabelas direto — neste projeto o service_role não tem
 * GRANT de escrita nas tabelas públicas.
 *
 * Idempotência: registrar_evento_pagamento() usa UNIQUE(evento_id).
 * A Stripe reenvia eventos até receber 2xx, então isso importa.
 *
 * Onde achar salão, plano e assinatura em cada tipo de evento fica em
 * lib/stripe-evento.ts — o formato muda entre versões da API.
 */

/** Eventos que alteram o estado da assinatura */
const EVENTOS: Record<string, "ativa" | "cancelada" | "inadimplente"> = {
  "checkout.session.completed":     "ativa",         // primeira assinatura
  "invoice.paid":                   "ativa",         // renovação
  "invoice.payment_failed":         "inadimplente",  // cartão recusado
  "customer.subscription.deleted":  "cancelada",
};

export async function POST(request: Request) {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segredo) {
    return NextResponse.json(
      { ok: false, error: "STRIPE_WEBHOOK_SECRET não configurado." },
      { status: 500 },
    );
  }

  const assinatura = request.headers.get("stripe-signature");
  if (!assinatura) {
    return NextResponse.json({ ok: false, error: "Sem assinatura." }, { status: 401 });
  }

  // Corpo CRU — a assinatura é calculada sobre os bytes originais,
  // então não dá para usar request.json() aqui.
  const raw = await request.text();

  let evento: Stripe.Event;
  try {
    evento = stripeClient().webhooks.constructEvent(raw, assinatura, segredo);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Assinatura inválida: ${String(err)}` },
      { status: 401 },
    );
  }

  const novoStatus = EVENTOS[evento.type];
  // Evento que não nos interessa: 200 para a Stripe parar de reenviar
  if (!novoStatus) {
    return NextResponse.json({ ok: true, ignorado: evento.type });
  }

  const { salaoId, plano: planoBruto, assinaturaId, centavos } = extrairVinculo(evento);

  if (!salaoId) {
    // 200 de propósito: sem salão não há o que fazer, e devolver erro
    // faria a Stripe reenviar para sempre.
    return NextResponse.json({ ok: true, sem_salao: evento.type });
  }

  const plano = planoBruto && isPlanoKey(planoBruto) ? planoBruto : null;

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json({ ok: false, error: `Admin client: ${String(err)}` }, { status: 500 });
  }

  const { data: novo, error: regErr } = await admin.rpc("registrar_evento_pagamento", {
    p_evento_id: evento.id,
    p_evento:    evento.type,
    p_salao_id:  salaoId,
    p_valor:     centavos != null ? centavos / 100 : null,
    p_metodo:    "stripe",
    p_payload:   evento as unknown as Record<string, unknown>,
  });

  if (regErr) {
    // 500 faz a Stripe reenviar — desejado aqui
    return NextResponse.json(
      { ok: false, error: `registrar_evento_pagamento: ${regErr.message}` },
      { status: 500 },
    );
  }

  if (novo === false) {
    return NextResponse.json({ ok: true, duplicado: evento.id });
  }

  const { error: updErr } = await admin.rpc("atualizar_assinatura", {
    p_salao_id:      salaoId,
    p_status:        novoStatus,
    p_plano:         plano,
    p_assinatura_id: assinaturaId,   // null mantém o atual (coalesce na função)
  });

  if (updErr) {
    return NextResponse.json(
      { ok: false, error: `atualizar_assinatura: ${updErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, evento: evento.type, status: novoStatus });
}
