#!/usr/bin/env node
/**
 * Gera os templates de e-mail do Supabase Auth em supabase/templates/.
 *
 * Por que um gerador em vez de 6 arquivos escritos à mão: o cabeçalho,
 * o botão e o rodapé são idênticos nos seis. Mantidos separados, uma
 * mudança de marca exigiria editar seis arquivos e as diferenças
 * apareceriam com o tempo.
 *
 * Uso: node scripts/gerar-templates-email.mjs
 *
 * Os arquivos gerados são para COPIAR E COLAR no painel:
 * Authentication > Emails > Templates.
 */
import fs from "node:fs";
import path from "node:path";

const LOGO  = "https://nexabase.com.br/logo.png";
const SITE  = "https://nexabase.com.br";
const OURO  = "#C89933";
const TINTA = "#1D1A05";

/** Casca comum: mesma estrutura do lembrete de agendamento (lib/email.ts) */
function casca({ titulo, corpo, rodape }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f5f5;color:${TINTA};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 16px 32px;border-bottom:2px solid ${OURO};">
              <img src="${LOGO}" alt="Nexa" width="120" style="display:block;max-width:120px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 0 32px;">
${corpo}
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #e5e5e5;padding:16px 32px;font-size:11px;color:#6B6B6B;text-align:center;line-height:1.5;">
${rodape}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const h1 = (t) =>
  `              <h1 style="font-size:24px;margin:0 0 12px 0;color:${TINTA};font-weight:700;line-height:1.2;">${t}</h1>`;

const p = (t) =>
  `              <p style="font-size:15px;margin:0 0 18px 0;color:${TINTA};line-height:1.6;">${t}</p>`;

/** Botão principal — <table> porque Outlook ignora padding em <a> */
const botao = (texto) =>
  `              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">
                <tr>
                  <td align="center" style="background:${OURO};border-radius:10px;">
                    <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:${TINTA};text-decoration:none;">${texto}</a>
                  </td>
                </tr>
              </table>`;

/** Alguns clientes bloqueiam o botão; o link cru é a saída */
const linkCru =
  `              <p style="font-size:12px;margin:0 0 20px 0;color:#6B6B6B;line-height:1.5;">
                Se o botão não funcionar, copie e cole este endereço no navegador:<br/>
                <span style="color:${OURO};word-break:break-all;">{{ .ConfirmationURL }}</span>
              </p>`;

/** Código de 6 dígitos, para quando não há link */
const codigo =
  `              <div style="background:#faf8f3;border-left:4px solid ${OURO};padding:18px 20px;margin:0 0 20px 0;border-radius:8px;text-align:center;">
                <p style="margin:0 0 6px 0;font-size:12px;color:#6B6B6B;">Seu código</p>
                <p style="margin:0;font-size:30px;font-weight:700;letter-spacing:6px;color:${TINTA};">{{ .Token }}</p>
              </div>`;

const aviso = (t) =>
  `              <p style="font-size:13px;margin:0 0 24px 0;color:#6B6B6B;line-height:1.6;">${t}</p>`;

const RODAPE_PADRAO =
  `              Este e-mail foi enviado pela <strong style="color:${OURO};">Nexa</strong>, plataforma de gestão para salões.<br/>
              <a href="${SITE}" style="color:#6B6B6B;">${SITE.replace("https://", "")}</a>`;

const RODAPE_IGNORAR =
  `              Se você não solicitou este e-mail, pode ignorá-lo com segurança — nada será alterado.<br/>
              Enviado pela <strong style="color:${OURO};">Nexa</strong> · <a href="${SITE}" style="color:#6B6B6B;">${SITE.replace("https://", "")}</a>`;

// ── os seis templates ──────────────────────────────────────────
const TEMPLATES = [
  {
    arquivo: "01-confirm-signup.html",
    painel:  "Confirm sign up",
    assunto: "Confirme seu e-mail para ativar a Nexa",
    html: casca({
      titulo: "Confirme seu e-mail",
      corpo: [
        h1("Bem-vindo à Nexa!"),
        p("Falta um passo para começar a usar sua conta: confirme que este e-mail é seu."),
        botao("Confirmar meu e-mail"),
        linkCru,
        aviso("O link vale por 24 horas. Depois disso, peça um novo na tela de acesso."),
      ].join("\n"),
      rodape: RODAPE_IGNORAR,
    }),
  },
  {
    arquivo: "02-invite-user.html",
    painel:  "Invite user",
    assunto: "Você foi convidado para a Nexa",
    html: casca({
      titulo: "Convite para a Nexa",
      corpo: [
        h1("Você foi convidado"),
        p("Alguém criou um acesso para você na Nexa, a plataforma onde o salão organiza agenda, clientes e finanças."),
        botao("Criar minha senha"),
        linkCru,
        aviso("Ao aceitar, você define sua senha e já entra no sistema."),
      ].join("\n"),
      rodape: RODAPE_IGNORAR,
    }),
  },
  {
    arquivo: "03-magic-link.html",
    painel:  "Magic link or OTP",
    assunto: "Seu link de acesso à Nexa",
    html: casca({
      titulo: "Seu acesso à Nexa",
      corpo: [
        h1("Entrar na Nexa"),
        p("Use o botão abaixo para acessar sua conta. Não é preciso digitar senha."),
        botao("Entrar agora"),
        linkCru,
        aviso("O link expira em 1 hora e só pode ser usado uma vez."),
      ].join("\n"),
      rodape: RODAPE_IGNORAR,
    }),
  },
  {
    arquivo: "04-change-email.html",
    painel:  "Change email address",
    assunto: "Confirme seu novo e-mail na Nexa",
    html: casca({
      titulo: "Confirme o novo e-mail",
      corpo: [
        h1("Confirme seu novo e-mail"),
        p("Recebemos um pedido para alterar o e-mail de acesso de <strong>{{ .Email }}</strong> para <strong>{{ .NewEmail }}</strong>."),
        p("Para concluir, confirme que este endereço é seu:"),
        botao("Confirmar novo e-mail"),
        linkCru,
        aviso("Enquanto não confirmar, o acesso continua pelo e-mail antigo."),
      ].join("\n"),
      rodape: RODAPE_IGNORAR,
    }),
  },
  {
    arquivo: "05-reset-password.html",
    painel:  "Reset password",
    assunto: "Redefinir sua senha da Nexa",
    html: casca({
      titulo: "Redefinir senha",
      corpo: [
        h1("Vamos redefinir sua senha"),
        p("Recebemos um pedido para criar uma nova senha de acesso à Nexa."),
        botao("Criar nova senha"),
        linkCru,
        aviso("O link vale por 1 hora. Sua senha atual continua valendo até você criar a nova."),
      ].join("\n"),
      rodape: RODAPE_IGNORAR,
    }),
  },
  {
    arquivo: "06-reauthentication.html",
    painel:  "Reauthentication",
    assunto: "Seu código de confirmação da Nexa",
    html: casca({
      titulo: "Código de confirmação",
      corpo: [
        h1("Confirme que é você"),
        p("Para concluir uma alteração sensível na sua conta, digite o código abaixo:"),
        codigo,
        aviso("O código expira em poucos minutos. Nunca compartilhe este número com ninguém — a Nexa jamais vai pedi-lo por telefone ou mensagem."),
      ].join("\n"),
      rodape: RODAPE_IGNORAR,
    }),
  },
];

// ── escrita ────────────────────────────────────────────────────
const destino = "supabase/templates";
fs.mkdirSync(destino, { recursive: true });

for (const t of TEMPLATES) {
  fs.writeFileSync(path.join(destino, t.arquivo), t.html, "utf8");
  console.log(`  ${t.arquivo.padEnd(28)} → "${t.painel}"`);
}

const leiame = `# Templates de e-mail do Supabase Auth

Gerados por \`scripts/gerar-templates-email.mjs\`. **Não edite estes HTML
direto**: altere o gerador e rode de novo, senão os seis divergem entre si.

## Como aplicar

Painel do Supabase → **Authentication → Emails → Templates**. Para cada um,
abra a seção, cole o **assunto** e o **corpo**, e salve.

| Arquivo | Seção no painel | Assunto |
|---|---|---|
${TEMPLATES.map((t) => `| \`${t.arquivo}\` | ${t.painel} | ${t.assunto} |`).join("\n")}

## Cuidados

- **Não remova \`{{ .ConfirmationURL }}\`** — é o link que faz a ação
  acontecer. Sem ele, o e-mail chega inútil.
- Em **Reauthentication** a variável é \`{{ .Token }}\` (código de 6 dígitos),
  não um link.
- Em **Change email address** existem \`{{ .Email }}\` (atual) e
  \`{{ .NewEmail }}\` (novo).
- A logo aponta para \`${LOGO}\`. Se o domínio mudar, altere no gerador.
- Depois de salvar, dispare um e-mail de teste e confira em um celular:
  é onde a maioria dos donos de salão vai abrir.
`;

fs.writeFileSync(path.join(destino, "README.md"), leiame, "utf8");
console.log(`\n  README.md com assuntos e instruções`);
console.log(`\n${TEMPLATES.length} templates em ${destino}/`);
