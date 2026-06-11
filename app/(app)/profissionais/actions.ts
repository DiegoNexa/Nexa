"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Validações compartilhadas ────────────────────────────────
const optionalTelefone = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().regex(/^\d{10,11}$/, "Telefone inválido (somente dígitos, DDD + número)").optional(),
);

const corHex = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida").optional(),
);

const percentual = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(",", ".").trim() : v),
  z.coerce.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
);

const valorMonetario = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(",", ".").trim() : v),
  z.coerce.number().min(0, "Não pode ser negativo").max(999999.99, "Valor muito alto"),
);

// ─── Form básico do profissional ──────────────────────────────
const profissionalSchema = z.object({
  nome:            z.string().trim().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  telefone:        optionalTelefone,
  cor:             corHex,
  comissao_padrao: percentual,
  salario_fixo:    valorMonetario,
});

export type ProfissionalState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof profissionalSchema>, string>>;
  values?: {
    nome?:            string;
    telefone?:        string;
    cor?:             string;
    comissao_padrao?: string;
    salario_fixo?:    string;
  };
};

function parseProfissional(formData: FormData) {
  const raw = {
    nome:            formData.get("nome"),
    telefone:        formData.get("telefone"),
    cor:             formData.get("cor"),
    comissao_padrao: formData.get("comissao_padrao"),
    salario_fixo:    formData.get("salario_fixo") ?? "0",
  };

  const preservedValues: ProfissionalState["values"] = {
    nome:            typeof raw.nome            === "string" ? raw.nome            : "",
    telefone:        typeof raw.telefone        === "string" ? raw.telefone        : "",
    cor:             typeof raw.cor             === "string" ? raw.cor             : "",
    comissao_padrao: typeof raw.comissao_padrao === "string" ? raw.comissao_padrao : "",
    salario_fixo:    typeof raw.salario_fixo    === "string" ? raw.salario_fixo    : "",
  };

  const parsed = profissionalSchema.safeParse(raw);
  return { parsed, preservedValues };
}

function collectFieldErrors(error: z.ZodError): ProfissionalState["fieldErrors"] {
  const out: ProfissionalState["fieldErrors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof z.infer<typeof profissionalSchema>;
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// ─── CRUD do profissional ─────────────────────────────────────
export async function criarProfissional(
  _prev: ProfissionalState,
  formData: FormData,
): Promise<ProfissionalState> {
  const { parsed, preservedValues } = parseProfissional(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Corrija os campos destacados.",
      fieldErrors: collectFieldErrors(parsed.error),
      values: preservedValues,
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const { data: u, error: userErr } = await supabase
    .from("usuarios")
    .select("salao_id")
    .eq("id", user.id)
    .maybeSingle<{ salao_id: string }>();

  if (userErr) {
    console.error("[profissionais] Erro ao buscar usuário:", userErr);
    return { ok: false, message: `Erro de acesso ao banco: ${userErr.message}`, values: preservedValues };
  }
  if (!u) {
    return { ok: false, message: "Sua conta não está vinculada a um salão.", values: preservedValues };
  }

  const { data: created, error } = await supabase
    .from("profissionais")
    .insert({
      salao_id:        u.salao_id,
      nome:            parsed.data.nome,
      telefone:        parsed.data.telefone ?? null,
      cor:             parsed.data.cor ?? null,
      comissao_padrao: parsed.data.comissao_padrao,
      salario_fixo:    parsed.data.salario_fixo,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { ok: false, message: error?.message ?? "Falha ao criar.", values: preservedValues };
  }

  revalidatePath("/profissionais");
  // Redireciona pra edição pra completar carga horária + comissões
  redirect(`/profissionais/${created.id}`);
}

export async function atualizarProfissional(
  id: string,
  _prev: ProfissionalState,
  formData: FormData,
): Promise<ProfissionalState> {
  const { parsed, preservedValues } = parseProfissional(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Corrija os campos destacados.",
      fieldErrors: collectFieldErrors(parsed.error),
      values: preservedValues,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profissionais")
    .update({
      nome:            parsed.data.nome,
      telefone:        parsed.data.telefone ?? null,
      cor:             parsed.data.cor ?? null,
      comissao_padrao: parsed.data.comissao_padrao,
      salario_fixo:    parsed.data.salario_fixo,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: error.message, values: preservedValues };
  }

  revalidatePath("/profissionais");
  revalidatePath(`/profissionais/${id}`);
  return { ok: true, message: "Dados atualizados." };
}

export async function alternarAtivoProfissional(id: string, ativoAtual: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("profissionais").update({ ativo: !ativoAtual }).eq("id", id);
  revalidatePath("/profissionais");
}

// Exclusão definitiva foi removida intencionalmente.
// Profissionais com histórico de atendimentos precisam manter o
// registro pra integridade da folha de pagamento. Use o toggle
// "desativar" na lista — o registro fica oculto mas é preservado.

// ─── Carga horária — sobrescreve tudo (7 dias atômicos) ───────
const diaSchema = z.object({
  dia_semana:  z.coerce.number().int().min(0).max(6),
  ativo:       z.literal("on").optional().nullable(),  // checkbox
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  hora_fim:    z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
});

export type CargaHorariaState = {
  ok:       boolean;
  message?: string;
};

export async function salvarCargaHoraria(
  profissionalId: string,
  _prev: CargaHorariaState,
  formData: FormData,
): Promise<CargaHorariaState> {
  const supabase = await createClient();

  // Coleta os 7 dias (0=domingo, 6=sábado)
  const linhas: Array<{ profissional_id: string; dia_semana: number; hora_inicio: string; hora_fim: string }> = [];

  for (let d = 0; d <= 6; d++) {
    const ativo  = formData.get(`dia_${d}_ativo`);
    const inicio = formData.get(`dia_${d}_inicio`);
    const fim    = formData.get(`dia_${d}_fim`);

    if (ativo !== "on") continue; // dia não selecionado, pula

    const parsed = diaSchema.safeParse({
      dia_semana:  d,
      ativo,
      hora_inicio: inicio,
      hora_fim:    fim,
    });

    if (!parsed.success) {
      return { ok: false, message: `Dia ${d}: horário inválido` };
    }

    if (parsed.data.hora_fim <= parsed.data.hora_inicio) {
      return { ok: false, message: `Dia ${d}: hora final deve ser maior que inicial` };
    }

    linhas.push({
      profissional_id: profissionalId,
      dia_semana:      parsed.data.dia_semana,
      hora_inicio:     parsed.data.hora_inicio,
      hora_fim:        parsed.data.hora_fim,
    });
  }

  // Sobrescreve tudo: DELETE + INSERT em sequência
  // (transação atômica seria ideal mas RLS não suporta begin/commit via PostgREST)
  const { error: delErr } = await supabase
    .from("carga_horaria")
    .delete()
    .eq("profissional_id", profissionalId);

  if (delErr) return { ok: false, message: `Erro ao limpar carga: ${delErr.message}` };

  if (linhas.length > 0) {
    const { error: insErr } = await supabase.from("carga_horaria").insert(linhas);
    if (insErr) return { ok: false, message: `Erro ao salvar: ${insErr.message}` };
  }

  revalidatePath(`/profissionais/${profissionalId}`);
  return { ok: true, message: "Carga horária salva." };
}

// ─── Comissões: overrides por serviço ────────────────────────
export type ComissoesState = {
  ok:       boolean;
  message?: string;
};

export async function salvarComissoes(
  profissionalId: string,
  _prev: ComissoesState,
  formData: FormData,
): Promise<ComissoesState> {
  const supabase = await createClient();

  // Busca quais serviços estão marcados como "não atende"
  // pra ignorar os inputs deles (não confundir vazio = padrão com não atende)
  const { data: bloqueados } = await supabase
    .from("comissoes_config")
    .select("servico_id")
    .eq("profissional_id", profissionalId)
    .eq("atende", false);

  const idsBloqueados = new Set((bloqueados ?? []).map((b) => b.servico_id));

  // Lê todas as entradas no formato `comissao_<servico_id>`
  // Vazio = remove override (volta a usar padrão)
  // Valor numérico válido = upsert do override
  const upserts: Array<{
    profissional_id: string;
    servico_id:      string;
    percentual:      number;
    atende:          boolean;
  }> = [];
  const deletes: string[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("comissao_")) continue;
    const servicoId = key.slice("comissao_".length);

    // Ignora serviços bloqueados (atende=false) — preserva o estado deles
    if (idsBloqueados.has(servicoId)) continue;

    const valStr = typeof value === "string" ? value.replace(",", ".").trim() : "";

    if (valStr === "") {
      deletes.push(servicoId);
      continue;
    }

    const num = Number(valStr);
    if (isNaN(num) || num < 0 || num > 100) {
      return { ok: false, message: `Comissão inválida para serviço (use 0-100): ${valStr}` };
    }

    upserts.push({
      profissional_id: profissionalId,
      servico_id:      servicoId,
      percentual:      num,
      atende:          true,
    });
  }

  // Remove só os que viraram vazios — bloqueados continuam intocados
  if (deletes.length > 0) {
    const { error: delErr } = await supabase
      .from("comissoes_config")
      .delete()
      .eq("profissional_id", profissionalId)
      .eq("atende", true)
      .in("servico_id", deletes);

    if (delErr) return { ok: false, message: `Erro ao limpar: ${delErr.message}` };
  }

  // Upsert dos que têm valor
  if (upserts.length > 0) {
    const { error: upErr } = await supabase
      .from("comissoes_config")
      .upsert(upserts, { onConflict: "profissional_id,servico_id" });

    if (upErr) return { ok: false, message: `Erro ao salvar: ${upErr.message}` };
  }

  revalidatePath(`/profissionais/${profissionalId}`);
  return { ok: true, message: "Comissões salvas." };
}

/**
 * Marca um serviço como "não atendido" pelo profissional.
 * Upsert com atende=false, percentual=null.
 */
export async function marcarNaoAtende(profissionalId: string, servicoId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("comissoes_config")
    .upsert(
      {
        profissional_id: profissionalId,
        servico_id:      servicoId,
        atende:          false,
        percentual:      null,
      },
      { onConflict: "profissional_id,servico_id" },
    );
  revalidatePath(`/profissionais/${profissionalId}`);
}

/**
 * Volta a marcar serviço como atendido (atende=true sem override —
 * volta a usar a comissão padrão do profissional).
 */
export async function voltarAtender(profissionalId: string, servicoId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("comissoes_config")
    .delete()
    .eq("profissional_id", profissionalId)
    .eq("servico_id", servicoId);
  revalidatePath(`/profissionais/${profissionalId}`);
}
