import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildLembreteAgendamento, enviarEmail } from "@/lib/email";

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";

const STATUSES_VALIDOS = ["agendado", "confirmado"];

/**
 * Endpoint chamado por cron a cada 15 min.
 *
 * Janela de captura: agendamentos que começam entre 45 e 75 min
 * no futuro. Janela de 30 min garante que mesmo com cron de 15min
 * cada agendamento será capturado em 2 ciclos consecutivos —
 * e o flag `lembrete_enviado` previne envio duplicado.
 *
 * Cada execução:
 *   1. Busca candidatos (lembrete_enviado=false, status válido,
 *      data dentro da janela, cliente com email)
 *   2. Pra cada um: monta template, envia via Resend
 *   3. Após sucesso: marca lembrete_enviado=true
 *
 * Resposta JSON com summary das execuções (útil pra debug).
 *
 * Auth: header `Authorization: Bearer ${CRON_SECRET}`.
 * Vercel envia esse header automaticamente quando CRON_SECRET
 * está configurado no projeto. Em outros providers, o cron
 * precisa enviar manualmente.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET não configurado no servidor." },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Admin client: ${String(err)}` },
      { status: 500 },
    );
  }

  // Janela: 45 a 75 minutos no futuro
  const agora   = Date.now();
  const inicio  = new Date(agora + 45 * 60 * 1000).toISOString();
  const fim     = new Date(agora + 75 * 60 * 1000).toISOString();

  type Linha = {
    id:               string;
    data_hora_inicio: string;
    cliente:          { nome: string; email: string | null } | { nome: string; email: string | null }[] | null;
    servico:          { nome: string } | { nome: string }[] | null;
    profissional:     { nome: string } | { nome: string }[] | null;
    salao:            { nome: string } | { nome: string }[] | null;
  };

  const { data: candidatos, error } = await admin
    .from("agendamentos")
    .select(`
      id,
      data_hora_inicio,
      cliente:clientes ( nome, email ),
      servico:servicos ( nome ),
      profissional:profissionais ( nome ),
      salao:saloes ( nome )
    `)
    .eq("lembrete_enviado", false)
    .in("status", STATUSES_VALIDOS)
    .gte("data_hora_inicio", inicio)
    .lte("data_hora_inicio", fim)
    .returns<Linha[]>();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const lista = candidatos ?? [];
  let enviados = 0;
  let semEmail = 0;
  const erros: string[] = [];

  const pickOne = <T>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  for (const a of lista) {
    const cliente      = pickOne(a.cliente);
    const servico      = pickOne(a.servico);
    const profissional = pickOne(a.profissional);
    const salao        = pickOne(a.salao);

    const email = cliente?.email?.trim();
    if (!email) {
      semEmail++;
      // Marca como enviado pra não tentar de novo num cliente sem email
      await admin.from("agendamentos").update({ lembrete_enviado: true }).eq("id", a.id);
      continue;
    }

    const tpl = buildLembreteAgendamento({
      clienteNome:  cliente?.nome ?? "Cliente",
      data:         formatarDataLonga(a.data_hora_inicio),
      horario:      formatarHora(a.data_hora_inicio),
      servico:      servico?.nome ?? "Serviço",
      profissional: profissional?.nome ?? "Profissional",
      salaoNome:    salao?.nome ?? "Salão",
    });

    const resultado = await enviarEmail({
      to:      email,
      subject: tpl.subject,
      html:    tpl.html,
      text:    tpl.text,
    });

    if (!resultado.ok) {
      erros.push(`${a.id}: ${resultado.error}`);
      continue;  // não marca como enviado — tenta novamente na próxima rodada
    }

    const { error: updErr } = await admin
      .from("agendamentos")
      .update({ lembrete_enviado: true })
      .eq("id", a.id);

    if (updErr) {
      erros.push(`${a.id} (marcação): ${updErr.message}`);
    }

    enviados++;
  }

  return NextResponse.json({
    ok:         true,
    janela:     { inicio, fim },
    candidatos: lista.length,
    enviados,
    semEmail,
    erros,
  });
}

function formatarDataLonga(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day:     "2-digit",
    month:   "long",
  });
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour:   "2-digit",
    minute: "2-digit",
  });
}
