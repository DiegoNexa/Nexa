#!/usr/bin/env node
/**
 * Verificação e preparo da conta Stripe (criado na troca de conta, 09/2026).
 *
 * Uso, na raiz do projeto:
 *   node scripts/stripe-conta.mjs verificar [--sem-producao]
 *       Confere conta, perfil público, webhooks, segredo e checkout.
 *   node scripts/stripe-conta.mjs criar-webhook [--gravar-env]
 *       Cria o endpoint de produção na conta da chave. --gravar-env grava
 *       o whsec no .env.local (só permitido com chave de TESTE).
 *
 * Lê STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET do ambiente e, na falta,
 * do .env.local. Para conferir a conta REAL sem gravar a chave em
 * arquivo (PowerShell):
 *   $env:STRIPE_SECRET_KEY="sk_live_..."; node scripts/stripe-conta.mjs verificar; Remove-Item Env:STRIPE_SECRET_KEY
 *
 * Os eventos esperados são lidos da própria rota do webhook, então este
 * script não diverge do código. Nunca imprime segredo inteiro, exceto o
 * whsec recém-criado (a Stripe só o mostra uma vez).
 */
import fs from "node:fs";
import Stripe from "stripe";

const URL_WEBHOOK = "https://nexa-web-pi.vercel.app/api/webhooks/stripe";
const ROTA        = "app/api/webhooks/stripe/route.ts";

const PERFIL = {
  nome:      "Nexa",
  site:      "https://nexa-web-pi.vercel.app",
  descritor: "ASSINATURA NEXA",
};

// ── utilidades ─────────────────────────────────────────────────
function arquivoEnv() {
  const out = {};
  if (!fs.existsSync(".env.local")) return out;
  for (const linha of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const i = linha.indexOf("=");
    if (i > 0 && !linha.trim().startsWith("#")) out[linha.slice(0, i).trim()] = linha.slice(i + 1).trim();
  }
  return out;
}

const mascara = (s) => (s ? s.slice(0, 14) + "…" : "(vazio)");

let falhas = 0;
let avisos = 0;
const ok    = (m) => console.log("  OK     " + m);
const aviso = (m) => { avisos++; console.log("  AVISO  " + m); };
const falha = (m) => { falhas++; console.log("  FALHA  " + m); };
const secao = (t) => console.log("\n=== " + t + " ===");

/** Eventos tratados pela rota — a fonte da verdade é o código */
function eventosDaRota() {
  const src    = fs.readFileSync(ROTA, "utf8");
  const inicio = src.indexOf("const EVENTOS");
  const bloco  = src.slice(inicio, src.indexOf("};", inicio));
  return [...bloco.matchAll(/"([a-z_]+\.[a-z_.]+)"\s*:/g)].map((m) => m[1]);
}

/** Trecho da chave que identifica a conta (vem depois de "_51") */
function trechoConta(chave) {
  const i = chave ? chave.indexOf("_51") : -1;
  return i >= 0 ? chave.slice(i + 3, i + 13) : null;
}

function apiVersionSdk() {
  return Stripe.API_VERSION ?? new Stripe("sk_test_x").getApiField("version");
}

// ── verificar ──────────────────────────────────────────────────
async function verificar({ semProducao }) {
  const arq     = arquivoEnv();
  const chave   = process.env.STRIPE_SECRET_KEY || arq.STRIPE_SECRET_KEY;
  const whsec   = process.env.STRIPE_WEBHOOK_SECRET || arq.STRIPE_WEBHOOK_SECRET;
  const eventos = eventosDaRota();

  secao("Chave");
  if (!chave) { falha("STRIPE_SECRET_KEY ausente"); return; }
  const m = chave.match(/^(sk|rk)_(test|live)_/);
  if (!m) { falha("formato de chave desconhecido: " + mascara(chave)); return; }
  const real = m[2] === "live";
  ok(mascara(chave) + " — modo " + (real ? "REAL" : "TESTE") + (m[1] === "rk" ? " (restrita)" : ""));

  // chave do ambiente e do arquivo precisam ser da MESMA conta
  const envChave = process.env.STRIPE_SECRET_KEY;
  if (envChave && arq.STRIPE_SECRET_KEY && envChave !== arq.STRIPE_SECRET_KEY) {
    if (trechoConta(envChave) === trechoConta(arq.STRIPE_SECRET_KEY)) ok("chave informada e chave do .env.local são da mesma conta");
    else falha("chave informada e chave do .env.local são de CONTAS DIFERENTES");
  }

  const stripe = new Stripe(chave);

  secao("SDK");
  const versaoSdk = JSON.parse(fs.readFileSync("node_modules/stripe/package.json", "utf8")).version;
  ok("stripe " + versaoSdk + " — API " + apiVersionSdk());

  secao("Conta");
  let conta;
  try { conta = await stripe.accounts.retrieve(); }
  catch (e) { falha("não foi possível ler a conta: " + e.message); return; }

  ok("id " + conta.id);
  if (conta.id.slice(6, 16) === trechoConta(chave)) ok("a chave pertence a esta conta");
  else aviso("não deu para casar o prefixo da chave com o id da conta");
  if (conta.country === "BR") ok("país BR"); else falha("país " + conta.country + " (esperado BR)");
  if (conta.default_currency === "brl") ok("moeda BRL"); else falha("moeda " + conta.default_currency + " (esperado brl)");
  ok("tipo: " + (conta.business_type ?? "(não definido)"));

  const req = conta.requirements ?? {};
  const pendente = [...(req.currently_due ?? []), ...(req.past_due ?? [])];
  if (pendente.length) falha("pendências de cadastro: " + pendente.join(", ")); else ok("sem pendências de cadastro");
  for (const e of req.errors ?? []) falha("erro de verificação em " + e.requirement + ": " + e.reason);
  if (req.disabled_reason) falha("conta desabilitada: " + req.disabled_reason); else ok("sem motivo de bloqueio");
  if ((req.pending_verification ?? []).length) aviso("em análise: " + req.pending_verification.join(", "));
  if (conta.charges_enabled) ok("cobranças ativas"); else (real ? falha : aviso)("cobranças NÃO ativas");
  if (conta.payouts_enabled) ok("repasses ativos");  else (real ? falha : aviso)("repasses NÃO ativos");
  if (!real) aviso("chave de TESTE não mostra pendências da conta real — confira no painel ou rode com a sk_live");

  secao("Perfil público");
  const bp = conta.business_profile ?? {};
  if (bp.name === PERFIL.nome) ok("nome " + bp.name); else aviso('nome "' + (bp.name ?? "") + '" (esperado "' + PERFIL.nome + '")');
  if ((bp.url ?? "").replace(/\/$/, "") === PERFIL.site) ok("site " + bp.url); else aviso('site "' + (bp.url ?? "") + '" (esperado ' + PERFIL.site + ")");
  if (bp.support_email) ok("e-mail de suporte preenchido"); else aviso("e-mail de suporte vazio");
  if (bp.support_phone) ok("telefone de suporte preenchido"); else aviso("telefone de suporte vazio");
  const desc = conta.settings?.payments?.statement_descriptor;
  if (desc === PERFIL.descritor) ok("descritor na fatura " + desc); else aviso('descritor "' + (desc ?? "") + '" (esperado "' + PERFIL.descritor + '")');
  const marca = conta.settings?.branding ?? {};
  if (marca.icon && marca.logo) ok("ícone e logo enviados"); else aviso("falta ícone ou logo da marca");

  secao("Webhooks");
  const lista  = await stripe.webhookEndpoints.list({ limit: 100 });
  const nossos = lista.data.filter((w) => w.url === URL_WEBHOOK);
  if (nossos.length === 0) falha("nenhum endpoint para " + URL_WEBHOOK + " — rode: criar-webhook");
  if (nossos.length > 1) falha(nossos.length + " endpoints para a mesma URL (cada um tem um whsec diferente — deixe só um)");
  for (const w of nossos) {
    if (w.status === "enabled") ok(w.id + " habilitado"); else falha(w.id + " status " + w.status);
    const faltam = eventos.filter((e) => !w.enabled_events.includes(e) && !w.enabled_events.includes("*"));
    if (faltam.length) falha("eventos faltando: " + faltam.join(", ")); else ok("os " + eventos.length + " eventos da rota estão assinados");
    const sobram = w.enabled_events.filter((e) => !eventos.includes(e));
    if (sobram.length) aviso("eventos a mais (a rota ignora): " + sobram.join(", "));
    if (!w.api_version) aviso("api_version = padrão da conta; recomendado fixar em " + apiVersionSdk());
    else if (w.api_version === apiVersionSdk()) ok("api_version " + w.api_version + " (igual ao SDK)");
    else aviso("api_version " + w.api_version + " difere do SDK " + apiVersionSdk());
  }

  secao("Segredo do webhook");
  if (!whsec) falha("STRIPE_WEBHOOK_SECRET ausente");
  else if (!/^whsec_[A-Za-z0-9]{20,}$/.test(whsec)) falha("formato inválido: " + mascara(whsec));
  else ok("formato válido " + mascara(whsec));

  if (whsec && !semProducao) {
    // Evento de um tipo que a rota ignora, assinado com ESTE segredo. Se a
    // produção responder 200 "ignorado", ela usa o mesmo whsec. Não grava nada.
    const payload = JSON.stringify({ id: "evt_verificacao_nexa", object: "event", type: "nexa.verificacao", data: { object: {} } });
    const header  = stripe.webhooks.generateTestHeaderString({ payload, secret: whsec });
    try {
      const r = await fetch(URL_WEBHOOK, { method: "POST", headers: { "stripe-signature": header, "content-type": "application/json" }, body: payload });
      const t = await r.text();
      // A rota responde 401 por causas diferentes; a mensagem diz qual.
      if (r.status === 200 && t.includes("nexa.verificacao")) ok("produção aceita este segredo (mesmo whsec na Vercel)");
      else if (t.includes("STRIPE_SECRET_KEY")) falha("produção está SEM STRIPE_SECRET_KEY (Vercel → Production → Redeploy)");
      else if (t.includes("STRIPE_WEBHOOK_SECRET")) falha("produção está SEM STRIPE_WEBHOOK_SECRET (Vercel → Production → Redeploy)");
      else if (t.includes("No signatures found")) falha("produção RECUSOU este segredo — o whsec da Vercel é outro (ou falta Redeploy)");
      else falha("resposta inesperada da produção: HTTP " + r.status + " " + t.slice(0, 120));
    } catch (e) { falha("produção inacessível: " + e.message); }
  }

  secao("Checkout");
  if (real) {
    aviso("modo REAL: teste de checkout pulado (use o pagamento de R$ 49 + reembolso)");
  } else {
    try {
      const s = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: 4900,
            recurring: { interval: "month", interval_count: 6 },
            product_data: { name: "Verificação Nexa" },
          },
        }],
        success_url: "https://nexa-web-pi.vercel.app/configuracoes",
        cancel_url:  "https://nexa-web-pi.vercel.app/assinatura",
        metadata: { verificacao: "sim" },
      });
      ok("sessão de assinatura em BRL criada (" + s.id.slice(0, 14) + "…)");
      await stripe.checkout.sessions.expire(s.id);
      ok("sessão de verificação expirada (nada fica pendurado)");
    } catch (e) { falha("checkout: " + e.message); }
  }

  console.log("\nRESULTADO: " + (falhas ? falhas + " falha(s)" : "sem falhas") + (avisos ? ", " + avisos + " aviso(s)" : ""));
  process.exitCode = falhas ? 1 : 0;
}

// ── criar-webhook ──────────────────────────────────────────────
async function criarWebhook({ gravarEnv }) {
  const arq   = arquivoEnv();
  const chave = process.env.STRIPE_SECRET_KEY || arq.STRIPE_SECRET_KEY;
  if (!chave) { console.error("STRIPE_SECRET_KEY ausente"); process.exitCode = 1; return; }
  const real   = chave.includes("_live_");
  const stripe = new Stripe(chave);
  const conta  = await stripe.accounts.retrieve();
  console.log("Conta " + conta.id + " — modo " + (real ? "REAL" : "TESTE"));

  const existentes = (await stripe.webhookEndpoints.list({ limit: 100 })).data.filter((w) => w.url === URL_WEBHOOK);
  if (existentes.length) {
    console.error("Já existe endpoint para esta URL (" + existentes.map((w) => w.id).join(", ") + "). Nada foi criado.");
    process.exitCode = 1;
    return;
  }

  const w = await stripe.webhookEndpoints.create({
    url:            URL_WEBHOOK,
    enabled_events: eventosDaRota(),
    api_version:    apiVersionSdk(),   // payload no formato que o SDK e lib/stripe-evento.ts esperam
    description:    "Nexa — assinaturas",
  });

  console.log("Criado " + w.id + " | eventos: " + w.enabled_events.join(", ") + " | api_version: " + w.api_version);

  if (gravarEnv) {
    if (real) {
      console.error("--gravar-env recusado com chave REAL: o segredo real vai só na Vercel (Production).");
    } else {
      let s = fs.readFileSync(".env.local", "utf8");
      s = /^STRIPE_WEBHOOK_SECRET=.*$/m.test(s)
        ? s.replace(/^STRIPE_WEBHOOK_SECRET=.*$/m, "STRIPE_WEBHOOK_SECRET=" + w.secret)
        : s.trimEnd() + "\nSTRIPE_WEBHOOK_SECRET=" + w.secret + "\n";
      fs.writeFileSync(".env.local", s);
      console.log("STRIPE_WEBHOOK_SECRET gravado no .env.local: " + mascara(w.secret));
      return;
    }
  }
  console.log("\nSegredo (a Stripe só mostra agora — copie):\n" + w.secret);
}

// ── entrada ────────────────────────────────────────────────────
const [cmd, ...flags] = process.argv.slice(2);
if (cmd === "verificar") {
  await verificar({ semProducao: flags.includes("--sem-producao") });
} else if (cmd === "criar-webhook") {
  await criarWebhook({ gravarEnv: flags.includes("--gravar-env") });
} else {
  console.log("uso: node scripts/stripe-conta.mjs verificar [--sem-producao]");
  console.log("     node scripts/stripe-conta.mjs criar-webhook [--gravar-env]");
  process.exitCode = 1;
}
