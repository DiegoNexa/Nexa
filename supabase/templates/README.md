# Templates de e-mail do Supabase Auth

Gerados por `scripts/gerar-templates-email.mjs`. **Não edite estes HTML
direto**: altere o gerador e rode de novo, senão os seis divergem entre si.

## Como aplicar

Painel do Supabase → **Authentication → Emails → Templates**. Para cada um,
abra a seção, cole o **assunto** e o **corpo**, e salve.

| Arquivo | Seção no painel | Assunto |
|---|---|---|
| `01-confirm-signup.html` | Confirm sign up | Confirme seu e-mail para ativar a Nexa |
| `02-invite-user.html` | Invite user | Você foi convidado para a Nexa |
| `03-magic-link.html` | Magic link or OTP | Seu link de acesso à Nexa |
| `04-change-email.html` | Change email address | Confirme seu novo e-mail na Nexa |
| `05-reset-password.html` | Reset password | Redefinir sua senha da Nexa |
| `06-reauthentication.html` | Reauthentication | Seu código de confirmação da Nexa |

## Cuidados

- **Não remova `{{ .ConfirmationURL }}`** — é o link que faz a ação
  acontecer. Sem ele, o e-mail chega inútil.
- Em **Reauthentication** a variável é `{{ .Token }}` (código de 6 dígitos),
  não um link.
- Em **Change email address** existem `{{ .Email }}` (atual) e
  `{{ .NewEmail }}` (novo).
- A logo aponta para `https://nexabase.com.br/logo.png`. Se o domínio mudar, altere no gerador.
- Depois de salvar, dispare um e-mail de teste e confira em um celular:
  é onde a maioria dos donos de salão vai abrir.
