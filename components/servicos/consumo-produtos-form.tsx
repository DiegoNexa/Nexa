"use client";

import { useActionState } from "react";
import { HoverButton } from "@/components/ui/hover-button";
import { salvarConsumo, type ConsumoState } from "@/app/(app)/servicos/actions";

const initialState: ConsumoState = { ok: false };

type Produto = {
  id:      string;
  nome:    string;
  unidade: string;
};

type Props = {
  servicoId: string;
  produtos:  Produto[];
  consumo:   Record<string, number>;   // produto_id → quantidade configurada
};

export function ConsumoProdutosForm({ servicoId, produtos, consumo }: Props) {
  const action = salvarConsumo.bind(null, servicoId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  if (produtos.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 text-center">
        <p className="text-sm text-on-surface-variant">
          Cadastre produtos no estoque para configurar o consumo automático deste serviço.{" "}
          <a href="/estoque/novo" className="text-primary hover:underline">Ir para estoque →</a>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-xs text-on-surface-variant">
        Informe quanto de cada produto este serviço consome. Ao concluir um agendamento,
        o estoque é debitado automaticamente. Deixe vazio o que não se aplica.
      </p>

      <div className="space-y-2">
        {produtos.map((p) => {
          const atual = consumo[p.id];
          return (
            <div key={p.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface truncate">{p.nome}</p>
              </div>
              <div className="relative w-28 flex-shrink-0">
                <input
                  type="text"
                  inputMode="decimal"
                  name={`consumo_${p.id}`}
                  placeholder="0"
                  defaultValue={atual !== undefined ? String(atual).replace(".", ",") : ""}
                  aria-label={`Consumo de ${p.nome}`}
                  className="w-full px-3 py-2 pr-10 rounded-lg text-sm text-right focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs pointer-events-none">
                  {p.unidade}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {state.message && (
        <div
          role="alert"
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: state.ok ? "rgba(200,153,51,0.08)" : "rgba(255, 180, 171, 0.08)",
            border:     state.ok ? "1px solid var(--color-primary)" : "1px solid var(--color-error)",
            color:      state.ok ? "var(--color-primary)" : "var(--color-error)",
          }}
        >
          {state.message}
        </div>
      )}

      <HoverButton type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando..." : "Salvar consumo"}
      </HoverButton>
    </form>
  );
}
