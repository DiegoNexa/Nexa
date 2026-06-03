"use client";

import { useActionState } from "react";
import { HoverButton } from "@/components/ui/hover-button";
import {
  salvarComissoes,
  marcarNaoAtende,
  voltarAtender,
  type ComissoesState,
} from "@/app/(app)/profissionais/actions";

const initialState: ComissoesState = { ok: false };

type Servico = {
  id:    string;
  nome:  string;
  preco: number;
};

type Props = {
  profissionalId: string;
  servicos:       Servico[];
  comissaoPadrao: number;
  overrides:      Record<string, number>;   // servico_id → percentual (atende=true com override)
  naoAtende:      Set<string>;              // servico_ids com atende=false
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const FORM_ID = "form-salvar-comissoes";

export function ComissoesConfigForm({
  profissionalId,
  servicos,
  comissaoPadrao,
  overrides,
  naoAtende,
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

  const atendidos    = servicos.filter((s) => !naoAtende.has(s.id));
  const naoAtendidos = servicos.filter((s) =>  naoAtende.has(s.id));

  return (
    <div className="space-y-3">
      <p className="text-xs text-on-surface-variant">
        Deixe vazio para usar a comissão padrão de <strong className="text-on-surface">{comissaoPadrao}%</strong>.
        Use o <strong className="text-on-surface">X</strong> para remover serviços que este profissional não realiza.
      </p>

      {/* Lista de atendidos */}
      {atendidos.length === 0 ? (
        <div className="glass-card rounded-xl p-6 text-center text-sm text-on-surface-variant">
          Este profissional não atende nenhum serviço no momento.
          {naoAtendidos.length > 0 && " Restaure algum da lista abaixo se necessário."}
        </div>
      ) : (
        atendidos.map((s) => {
          const override = overrides[s.id];
          const valorComissao = (s.preco * (override ?? comissaoPadrao)) / 100;

          return (
            <div
              key={s.id}
              className="glass-card rounded-xl p-3 sm:p-4 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface truncate">{s.nome}</p>
                <p className="text-xs text-on-surface-variant">{BRL.format(s.preco)}</p>
              </div>

              {/* Input de % — associado ao form principal via attribute */}
              <div className="relative w-24 flex-shrink-0">
                <input
                  type="text"
                  inputMode="decimal"
                  form={FORM_ID}
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

              {/* Preview do valor da comissão (desktop) */}
              <div className="hidden sm:block w-20 text-right flex-shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-outline">Comissão</p>
                <p className="text-sm font-semibold text-primary">{BRL.format(valorComissao)}</p>
              </div>

              {/* Botão X — Server Action isolado pro "marcar como não atende" */}
              <form action={marcarNaoAtende.bind(null, profissionalId, s.id)}>
                <button
                  type="submit"
                  aria-label={`Remover ${s.nome}`}
                  title="Marcar como não atendido"
                  className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all-custom flex-shrink-0"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>close</span>
                </button>
              </form>
            </div>
          );
        })
      )}

      {/* Form principal (vazio — inputs estão associados via attribute) */}
      <form id={FORM_ID} action={formAction}>
        {state.message && (
          <div
            role="alert"
            className="rounded-xl px-4 py-3 text-sm mb-3"
            style={{
              background: state.ok ? "rgba(200,153,51,0.08)" : "rgba(255, 180, 171, 0.08)",
              border:     state.ok ? "1px solid var(--color-primary)" : "1px solid var(--color-error)",
              color:      state.ok ? "var(--color-primary)" : "var(--color-error)",
            }}
          >
            {state.message}
          </div>
        )}

        {atendidos.length > 0 && (
          <HoverButton type="submit" disabled={isPending} className="w-full">
            {isPending ? "Salvando..." : "Salvar comissões"}
          </HoverButton>
        )}
      </form>

      {/* Lista de não atendidos */}
      {naoAtendidos.length > 0 && (
        <div className="pt-4 mt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-xs uppercase tracking-wider text-outline mb-2 flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>block</span>
            Não atende
          </p>
          <div className="space-y-2">
            {naoAtendidos.map((s) => (
              <div
                key={s.id}
                className="rounded-xl p-3 sm:p-4 flex items-center gap-3"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-on-surface-variant truncate line-through opacity-70">
                    {s.nome}
                  </p>
                  <p className="text-xs text-outline">{BRL.format(s.preco)}</p>
                </div>
                <form action={voltarAtender.bind(null, profissionalId, s.id)}>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-all-custom inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add</span>
                    Voltar a atender
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
