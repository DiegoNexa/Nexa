import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildLembreteAgendamento, enviarEmail } from "@/lib/email";

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";

/**
 * Endpoint chamado por cron a cada 15 min.
 *
 * Usa funções SECURITY DEFINER (migration 016) em vez de query
 * direta. Isso evita problemas de GRANT/role no Postgres,
 * especialmente em projetos Supabase novos onde service_role
 * pode não ter permissões automáticas nas tabelas públicas.
 *
 * Fluxo:
 *   1. Valida CRON_SECRET no header Authorization
 *   2. supabase.rpc('listar_lembretes_pendentes') retorna
 *      candidatos (já filtra janela 45-75min + email não vazio)
 *   3. Pra cada um: monta template, envia via Resend
 *   4. Após sucesso: supabase.rpc('marcar_lembrete_enviado', { p_id })
 *
 * Resposta JSON com summary das execuções.
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

  type Candidato = {
    agendamento_id:    string;
    data_hora_inicio:  string;
    cliente_nome:      string;
    cliente_email:     string;
    servico_nome:      string;
    profissional_nome: string;
    salao_nome:        string;
  };

  const { data, error } = await admin.rpc("listar_lembretes_pendentes");

  if (error) {
    return NextResponse.json(
      { ok: false, error: `RPC listar_lembretes_pendentes: ${error.message}` },
      { status: 500 },
    );
  }

  const lista = (data ?? []) as Candidato[];
  let enviados = 0;
  const erros: string[] = [];

  for (const c of lista) {
    const tpl = buildLembreteAgendamento({
      clienteNome:  c.cliente_nome,
      data:         formatarDataLonga(c.data_hora_inicio),
      horario:      formatarHora(c.data_hora_inicio),
      servico:      c.servico_nome,
      profissional: c.profissional_nome,
      salaoNome:    c.salao_nome,
    });

    const resultado = await enviarEmail({
      to:      c.cliente_email,
      subject: tpl.subject,
      html:    tpl.html,
      text:    tpl.text,
    });

    if (!resultado.ok) {
      erros.push(`${c.agendamento_id}: ${resultado.error}`);
      continue;  // não marca como enviado — tenta novamente na próxima rodada
    }

    const { error: updErr } = await admin.rpc("marcar_lembrete_enviado", {
      p_id: c.agendamento_id,
    });

    if (updErr) {
      erros.push(`${c.agendamento_id} (marcação): ${updErr.message}`);
    }

    enviados++;
  }

  return NextResponse.json({
    ok:         true,
    candidatos: lista.length,
    enviados,
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
