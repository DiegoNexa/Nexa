"use client";

import { useActionState } from "react";
import { HoverButton } from "@/components/ui/hover-button";
import { salvarComissoes, type ComissoesState } from "@/app/(app)/profissionais/actions";

const initialState: ComissoesState = { ok: false };

type Servico = {
  id:    string;
  nome:  string;
  preco: number;
};

type Props = {
  profissionalId:    string;
  servicos:          Servico[];
  comissaoPadrao:    number;
  overrides:         Record<string, number>; // servico_id → percentual
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ComissoesConfigForm({
  profissionalId,
  servicos,
  comissaoPadrao,
  overrides,
}: Props) {
  const action = salvarComissoes.bind(null, profissionalId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  if (servicos.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 text-center">
        <p className="text-sm text-on-surface-variant">
          Cadastre serviços primeiro para configurar comissões específicas.{" "}
          <a href="/servicos/novo" className="text-primary hover:underline">
            Ir para serviços →
          </a>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-xs text-on-surface-variant mb-2">
        Deixe vazio para usar a comissão padrão de <strong className="text-on-surface">{comissaoPadrao}%</strong>.
      </p>

      {servicos.map((s) => {
        const override = overrides[s.id];
        const valorComissao =
          (s.preco * (override ?? comissaoPadrao)) / 100;

        return (
          <div
            key={s.id}
            className="glass-card rounded-xl p-3 sm:p-4 flex items-center gap-3"
          >
            {/* Nome + preço */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-on-surface truncate">{s.nome}</p>
              <p className="text-xs text-on-surface-variant">{BRL.format(s.preco)}</p>
            </div>

            {/* Input de % */}
            <div className="relative w-24 flex-shrink-0">
              <input
                type="text"
                inputMode="decimal"
                name={`comissao_${s.id}`}
                placeholder={`${comissaoPadrao}`}
                defaultValue={override !== undefined ? override.toString() : ""}
                aria-label={`Comissão para ${s.nome}`}
                className="w-full px-3 py-2 pr-8 rounded-lg text-sm text-right focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs pointer-events-none">
                %
              </span>
            </div>

            {/* Valor calculado preview */}
            <div className="hidden sm:block w-24 text-right flex-shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-outline">Comissão</p>
              <p className="text-sm font-semibold text-primary">{BRL.format(valorComissao)}</p>
            </div>
          </div>
        );
      })}

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
        {isPending ? "Salvando..." : "Salvar comissões"}
      </HoverButton>
    </form>
  );
}
