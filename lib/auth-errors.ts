/**
 * Mapeia erros do Supabase Auth para mensagens controladas
 * em PT-BR, amigáveis pro usuário.
 *
 * Estratégia em camadas:
 *   1. Primeiro tenta casar pelo `error.code` (estável, vem da
 *      AuthApiError do Supabase). Códigos não mudam entre versões.
 *   2. Fallback: pattern matching por substring na mensagem.
 *      Útil quando o erro não vem da AuthApiError (ex: erros do
 *      Postgres via trigger) ou em versões antigas do SDK.
 *   3. Fallback final: mensagem genérica.
 *
 * Filosofia:
 *   - Mensagens em login = genéricas (não revelar se o e-mail existe)
 *   - Mensagens em signup/reset = específicas o suficiente pra ajudar
 *   - Quando não reconhecemos o erro = fallback genérico
 *
 * Referência:
 *   https://supabase.com/docs/reference/javascript/auth-error-codes
 */

type AuthError = { message?: string; code?: string } | null | undefined;

const FALLBACK = "Algo deu errado. Tente novamente em instantes.";

// ─── Códigos do Supabase ──────────────────────────────────────
const SIGNUP_CODES: Record<string, string> = {
  user_already_exists:            "Este e-mail já está cadastrado.",
  email_address_invalid:          "E-mail inválido.",
  email_address_not_authorized:   "E-mails temporários não são aceitos.",
  signup_disabled:                "Cadastro temporariamente indisponível.",
  over_request_rate_limit:        "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  over_email_send_rate_limit:     "Muitos e-mails enviados. Aguarde alguns minutos e tente novamente.",
  validation_failed:              "Dados de cadastro inválidos.",
};

const RESET_CODES: Record<string, string> = {
  same_password:                  "A nova senha precisa ser diferente da senha anterior.",
  session_not_found:              "Link expirado. Solicite um novo e-mail de recuperação.",
  bad_jwt:                        "Link expirado. Solicite um novo e-mail de recuperação.",
  session_expired:                "Link expirado. Solicite um novo e-mail de recuperação.",
  over_request_rate_limit:        "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
};

// ─── Helper de senha (cobre signup E reset) ───────────────────
function mapWeakPassword(message: string): string {
  if (message.includes("leak") || message.includes("compromise")) {
    return "Essa senha apareceu em vazamentos públicos. Escolha outra.";
  }
  if (message.includes("character") || message.includes("digit") || message.includes("letter")) {
    return "Sua senha precisa ter letras e números.";
  }
  if (message.includes("short") || message.includes("least") || message.includes("minimum")) {
    return "Sua senha está muito curta. Mínimo 8 caracteres.";
  }
  return "Senha muito fraca. Use letras, números e no mínimo 8 caracteres.";
}

// ─── Mappers públicos ─────────────────────────────────────────

export function mapSignupError(error: AuthError): string {
  const code = error?.code;
  const msg  = error?.message?.toLowerCase() ?? "";

  // 1. Code-based (estável)
  if (code === "weak_password") return mapWeakPassword(msg);
  if (code && SIGNUP_CODES[code]) return SIGNUP_CODES[code];

  // 2. Fallback por substring (caso code venha undefined)
  if (msg.includes("registered") || msg.includes("already") || msg.includes("exists")) {
    return SIGNUP_CODES.user_already_exists;
  }
  if (msg.includes("rate limit")) {
    return SIGNUP_CODES.over_request_rate_limit;
  }
  if (msg.includes("password")) return mapWeakPassword(msg);
  if (msg.includes("email") && msg.includes("invalid")) {
    return SIGNUP_CODES.email_address_invalid;
  }
  if (msg.includes("email") && (msg.includes("disposable") || msg.includes("not authorized"))) {
    return SIGNUP_CODES.email_address_not_authorized;
  }

  return FALLBACK;
}

export function mapLoginError(_error: AuthError): string {
  // Mensagem sempre idêntica — bloqueia enumeração de contas.
  // Trade-off conhecido: usuário com "email_not_confirmed" vê o
  // mesmo erro de senha errada. Optamos por segurança sobre UX.
  return "E-mail ou senha incorretos.";
}

export function mapResetError(error: AuthError): string {
  const code = error?.code;
  const msg  = error?.message?.toLowerCase() ?? "";

  // 1. Code-based
  if (code === "weak_password") return mapWeakPassword(msg);
  if (code && RESET_CODES[code]) return RESET_CODES[code];

  // 2. Fallback por substring
  if (msg.includes("session") || msg.includes("token") || msg.includes("expired") || msg.includes("invalid")) {
    return RESET_CODES.session_not_found;
  }
  if (msg.includes("same") && msg.includes("password")) {
    return RESET_CODES.same_password;
  }
  if (msg.includes("password")) return mapWeakPassword(msg);
  if (msg.includes("rate limit")) {
    return RESET_CODES.over_request_rate_limit;
  }

  return FALLBACK;
}
