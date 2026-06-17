/**
 * Wrapper de envio de e-mails via Resend.
 *
 * Não usa SDK — fetch direto pra evitar bundle bloat. A API
 * do Resend é simples e estável.
 *
 * Env vars:
 *   - RESEND_API_KEY  (obrigatório)
 *   - EMAIL_FROM      (recomendado, formato "Nome <email@dominio.com>")
 *                     default: "Nexa <onboarding@resend.dev>"
 *                     ⚠️ onboarding@resend.dev SÓ envia para o e-mail
 *                     da conta Resend. Pra produção precisa verificar
 *                     domínio próprio.
 */

type EmailParams = {
  to:      string;
  subject: string;
  html:    string;
  text:    string;
};

type EnviarResultado =
  | { ok: true;  id: string }
  | { ok: false; error: string };

export async function enviarEmail(params: EmailParams): Promise<EnviarResultado> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.EMAIL_FROM ?? "Nexa <onboarding@resend.dev>";

  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY não configurada." };
  }

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization:   `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to:      params.to,
        subject: params.subject,
        html:    params.html,
        text:    params.text,
      }),
    });
  } catch (err) {
    return { ok: false, error: `Falha de rede: ${String(err)}` };
  }

  if (!res.ok) {
    const body = await res.text();
    return {
      ok: false,
      error: `Resend HTTP ${res.status}: ${body.slice(0, 200)}`,
    };
  }

  const json = (await res.json()) as { id?: string };
  return { ok: true, id: json.id ?? "" };
}

// ─── Template: lembrete de agendamento ───────────────────────

export type LembreteAgendamentoData = {
  clienteNome:        string;
  data:               string;  // "quinta-feira, 12 de junho"
  horario:            string;  // "14:30"
  servico:            string;
  profissional:       string;
  salaoNome:          string;
};

export function buildLembreteAgendamento(p: LembreteAgendamentoData) {
  const primeiroNome = p.clienteNome.trim().split(/\s+/)[0] ?? p.clienteNome;
  const subject      = `Lembrete: seu horário no ${p.salaoNome}`;

  // Versão texto puro (fallback pra clients sem HTML)
  const text = `Olá, ${primeiroNome}!

Seu horário está confirmado para:

📅 ${p.data} às ${p.horario}
💼 ${p.servico}
👤 ${p.profissional}

Estamos prontos para receber você. Caso não possa comparecer, pedimos que nos avise antecipadamente.

Até breve!

Equipe ${p.salaoNome}

---
Lembrete enviado pela plataforma Nexa.`;

  // Versão HTML — inline styles pra max compat de clients (Gmail/Outlook)
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f5f5;color:#1D1A05;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 16px 32px;border-bottom:2px solid #C89933;">
              <p style="color:#C89933;font-size:18px;font-weight:700;margin:0;letter-spacing:0.8px;">Nexa</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <h1 style="font-size:24px;margin:0 0 12px 0;color:#1D1A05;font-weight:700;line-height:1.2;">Olá, ${escapeHtml(primeiroNome)}!</h1>
              <p style="font-size:15px;margin:0 0 20px 0;color:#1D1A05;line-height:1.5;">Seu horário está confirmado para:</p>

              <div style="background:#faf8f3;border-left:4px solid #C89933;padding:16px 20px;margin:0 0 24px 0;border-radius:8px;">
                <p style="margin:6px 0;font-size:14px;color:#1D1A05;line-height:1.6;">📅 <strong>${escapeHtml(p.data)}</strong> às <strong>${escapeHtml(p.horario)}</strong></p>
                <p style="margin:6px 0;font-size:14px;color:#1D1A05;line-height:1.6;">💼 <strong>${escapeHtml(p.servico)}</strong></p>
                <p style="margin:6px 0;font-size:14px;color:#1D1A05;line-height:1.6;">👤 <strong>${escapeHtml(p.profissional)}</strong></p>
              </div>

              <p style="font-size:14px;margin:0 0 18px 0;color:#1D1A05;line-height:1.6;">Estamos prontos para receber você. Caso não possa comparecer, pedimos que nos avise antecipadamente.</p>

              <p style="font-size:14px;margin:0 0 8px 0;color:#1D1A05;">Até breve!</p>
              <p style="margin:0 0 28px 0;"><strong style="color:#C89933;font-size:15px;">Equipe ${escapeHtml(p.salaoNome)}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #e5e5e5;padding:16px 32px;font-size:11px;color:#6B6B6B;text-align:center;line-height:1.5;">
              Você está recebendo este e-mail porque agendou um horário através do salão.<br/>
              Lembrete enviado pela plataforma <strong style="color:#C89933;">Nexa</strong>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}
