"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const CATEGORIAS = ["aluguel", "produtos", "contas", "equipamentos", "marketing", "impostos", "outros"] as const;

const valorSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(",", ".").trim() : v),
  z.coerce.number().gt(0, "Valor deve ser maior que zero").max(9999999.99, "Valor muito alto"),
);

const despesaSchema = z.object({
  descricao:    z.string().trim().min(1, "Informe uma descrição").max(120, "Descrição muito longa"),
  categoria:    z.enum(CATEGORIAS, { message: "Categoria inválida" }),
  valor:        valorSchema,
  data_despesa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  // "nao" = despesa única | "mensal"/"semanal" = cria molde recorrente
  repeticao:    z.enum(["nao", "mensal", "semanal"]).default("nao"),
});

export type DespesaState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof despesaSchema>, string>>;
};

export async function criarDespesa(
  _prev: DespesaState,
  formData: FormData,
): Promise<DespesaState> {
  const parsed = despesaSchema.safeParse({
    descricao:    formData.get("descricao"),
    categoria:    formData.get("categoria"),
    valor:        formData.get("valor"),
    data_despesa: formData.get("data_despesa"),
    repeticao:    formData.get("repeticao") ?? "nao",
  });

  if (!parsed.success) {
    const fieldErrors: DespesaState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof despesaSchema>;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Corrija os campos destacados.", fieldErrors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const { data: u } = await supabase
    .from("usuarios")
    .select("salao_id")
    .eq("id", user.id)
    .maybeSingle<{ salao_id: string }>();

  if (!u) return { ok: false, message: "Sua conta não está vinculada a um salão." };

  // ── Despesa única ────────────────────────────────────────
  if (parsed.data.repeticao === "nao") {
    const { error } = await supabase.from("despesas").insert({
      salao_id:     u.salao_id,
      descricao:    parsed.data.descricao,
      categoria:    parsed.data.categoria,
      valor:        parsed.data.valor,
      data_despesa: parsed.data.data_despesa,
      created_by:   user.id,
    });

    if (error) return { ok: false, message: error.message };

    revalidatePath("/financeiro");
    return { ok: true, message: "Despesa registrada." };
  }

  // ── Despesa recorrente (molde) ───────────────────────────
  // dia_mes / dia_semana derivados da data escolhida. Interpretamos
  // a data como UTC pra evitar shift de fuso.
  const [ano, mes, dia] = parsed.data.data_despesa.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  const mensal = parsed.data.repeticao === "mensal";

  const { error: recErr } = await supabase.from("despesas_recorrentes").insert({
    salao_id:    u.salao_id,
    descricao:   parsed.data.descricao,
    categoria:   parsed.data.categoria,
    valor:       parsed.data.valor,
    frequencia:  parsed.data.repeticao,
    dia_mes:     mensal ? Math.min(dia, 28) : null,   // até dia 28 (existe em todo mês)
    dia_semana:  mensal ? null : d.getUTCDay(),        // 0=domingo
    data_inicio: parsed.data.data_despesa,
  });

  if (recErr) return { ok: false, message: recErr.message };

  // Não materializa no banco: a projeção da recorrente é calculada
  // na hora pelo carregarFinanceiro (sempre entra no total do mês).
  revalidatePath("/financeiro");
  return {
    ok: true,
    message: mensal ? "Despesa fixa mensal criada." : "Despesa fixa semanal criada.",
  };
}

export async function excluirDespesa(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("despesas").delete().eq("id", id);
  revalidatePath("/financeiro");
}

/**
 * Para um molde de despesa recorrente (soft-delete via ativo=false).
 * As ocorrências já lançadas no histórico permanecem intactas — só
 * as futuras deixam de ser geradas. Manter a linha (em vez de apagar)
 * preserva o log de competências e evita regenerar meses antigos.
 */
export async function excluirRecorrente(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("despesas_recorrentes").update({ ativo: false }).eq("id", id);
  revalidatePath("/financeiro");
}
