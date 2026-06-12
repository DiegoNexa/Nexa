"use client";

import { useActionState, useMemo, useState } from "react";
import { HoverButton } from "@/components/ui/hover-button";
import { criarAgendamento, type CriarAgendamentoState } from "@/app/(app)/agenda/actions";

const initialState: CriarAgendamentoState = { ok: false };

type Profissional = {
  id:    string;
  nome:  string;
  cor:   string | null;
};

type Servico = {
  id:               string;
  nome:             string;
  duracao_minutos:  number;
  preco:            number;
};

type Cliente = {
  id:        string;
  nome:      string;
  telefone:  string | null;
};

type NaoAtende = {
  profissional_id: string;
  servico_id:      string;
};

type Props = {
  profissionais:        Profissional[];
  servicos:             Servico[];
  clientes:             Cliente[];
  naoAtende:            NaoAtende[];
  /** Pré-preenche o profissional (ex: vindo da agenda) */
  preProfissionalId?:   string;
  /** Pré-preenche a data/hora de início (formato datetime-local YYYY-MM-DDTHH:mm) */
  preDataHora?:         string;
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarTelefone(t: string | null): string {
  if (!t) return "";
  if (t.length === 11) return ` (${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}`;
  if (t.length === 10) return ` (${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}`;
  return ` ${t}`;
}

export function AgendamentoForm({
  profissionais,
  servicos,
  clientes,
  naoAtende,
  preProfissionalId,
  preDataHora,
}: Props) {
  const [state, formAction, isPending] = useActionState(criarAgendamento, initialState);

  const [profissionalId, setProfissionalId] = useState<string>(
    state.values?.profissional_id || preProfissionalId || "",
  );

  // Filtra serviços: remove os que o profissional NÃO atende
  const servicosDisponiveis = useMemo(() => {
    if (!profissionalId) return servicos;
    const bloqueados = new Set(
      naoAtende
        .filter((n) => n.profissional_id === profissionalId)
        .map((n) => n.servico_id),
    );
    return servicos.filter((s) => !bloqueados.has(s.id));
  }, [profissionalId, servicos, naoAtende]);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {/* Profissional */}
      <div>
        <label htmlFor="profissional_id" className="block text-sm font-medium text-on-surface mb-1.5">
          Profissional
        </label>
        <div className="relative">
          <select
            id="profissional_id"
            name="profissional_id"
            required
            value={profissionalId}
            onChange={(e) => setProfissionalId(e.target.value)}
            aria-invalid={state.fieldErrors?.profissional_id ? "true" : undefined}
            className="w-full px-4 py-3 pr-10 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface appearance-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: state.fieldErrors?.profissional_id
                ? "1px solid var(--color-error)"
                : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <option value="" disabled style={{ color: "#000", background: "#fff" }}>
              Selecione um profissional...
            </option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id} style={{ color: "#000", background: "#fff" }}>
                {p.nome}
              </option>
            ))}
          </select>
          <span
            className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
            style={{ fontSize: "20px" }}
          >
            expand_more
          </span>
        </div>
        {state.fieldErrors?.profissional_id && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
            {state.fieldErrors.profissional_id}
          </p>
        )}
      </div>

      {/* Serviço (filtrado pelo profissional) */}
      <div>
        <label htmlFor="servico_id" className="block text-sm font-medium text-on-surface mb-1.5">
          Serviço
          {profissionalId && servicosDisponiveis.length < servicos.length && (
            <span className="text-xs text-outline ml-2">
              (filtrado pelos serviços que o profissional atende)
            </span>
          )}
        </label>
        <div className="relative">
          <select
            id="servico_id"
            name="servico_id"
            required
            defaultValue={state.values?.servico_id ?? ""}
            disabled={!profissionalId}
            aria-invalid={state.fieldErrors?.servico_id ? "true" : undefined}
            className="w-full px-4 py-3 pr-10 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: state.fieldErrors?.servico_id
                ? "1px solid var(--color-error)"
                : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <option value="" disabled style={{ color: "#000", background: "#fff" }}>
              {profissionalId ? "Selecione um serviço..." : "Escolha um profissional primeiro"}
            </option>
            {servicosDisponiveis.map((s) => (
              <option key={s.id} value={s.id} style={{ color: "#000", background: "#fff" }}>
                {s.nome} · {BRL.format(s.preco)} · {s.duracao_minutos}min
              </option>
            ))}
          </select>
          <span
            className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
            style={{ fontSize: "20px" }}
          >
            expand_more
          </span>
        </div>
        {state.fieldErrors?.servico_id && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
            {state.fieldErrors.servico_id}
          </p>
        )}
      </div>

      {/* Cliente */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="cliente_id" className="block text-sm font-medium text-on-surface">
            Cliente
          </label>
          <a
            href="/clientes/novo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>add</span>
            Cadastrar novo cliente
          </a>
        </div>
        <div className="relative">
          <select
            id="cliente_id"
            name="cliente_id"
            required
            defaultValue={state.values?.cliente_id ?? ""}
            aria-invalid={state.fieldErrors?.cliente_id ? "true" : undefined}
            className="w-full px-4 py-3 pr-10 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface appearance-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: state.fieldErrors?.cliente_id
                ? "1px solid var(--color-error)"
                : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <option value="" disabled style={{ color: "#000", background: "#fff" }}>
              Selecione um cliente...
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id} style={{ color: "#000", background: "#fff" }}>
                {c.nome}{formatarTelefone(c.telefone)}
              </option>
            ))}
          </select>
          <span
            className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
            style={{ fontSize: "20px" }}
          >
            expand_more
          </span>
        </div>
        {state.fieldErrors?.cliente_id && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
            {state.fieldErrors.cliente_id}
          </p>
        )}
      </div>

      {/* Data e hora */}
      <div>
        <label htmlFor="data_hora_inicio" className="block text-sm font-medium text-on-surface mb-1.5">
          Data e hora de início
        </label>
        <p className="text-xs text-on-surface-variant mb-2">
          O horário de término é calculado automaticamente pela duração do serviço.
        </p>
        <input
          id="data_hora_inicio"
          name="data_hora_inicio"
          type="datetime-local"
          required
          defaultValue={state.values?.data_hora_inicio || preDataHora || ""}
          aria-invalid={state.fieldErrors?.data_hora_inicio ? "true" : undefined}
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: state.fieldErrors?.data_hora_inicio
              ? "1px solid var(--color-error)"
              : "1px solid rgba(255,255,255,0.1)",
          }}
        />
        {state.fieldErrors?.data_hora_inicio && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
            {state.fieldErrors.data_hora_inicio}
          </p>
        )}
      </div>

      {/* Observações */}
      <div>
        <label htmlFor="observacoes" className="block text-sm font-medium text-on-surface mb-1.5">
          Observações <span className="text-outline">(opcional)</span>
        </label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          maxLength={500}
          placeholder="Ex: cliente prefere química mais leve, pediu pra chegar 10min antes..."
          defaultValue={state.values?.observacoes ?? ""}
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant resize-none"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        />
      </div>

      {/* Mensagem geral */}
      {state.message && !state.fieldErrors && (
        <div
          role="alert"
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(255, 180, 171, 0.08)",
            border: "1px solid var(--color-error)",
            color: "var(--color-error)",
          }}
        >
          {state.message}
        </div>
      )}

      <HoverButton type="submit" disabled={isPending} className="w-full">
        {isPending ? "Agendando..." : "Criar agendamento"}
      </HoverButton>
    </form>
  );
}
