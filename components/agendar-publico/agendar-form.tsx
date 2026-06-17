"use client";

import { useActionState, useMemo, useState } from "react";
import {
  criarAgendamentoPublico,
  type AgendarPublicoState,
} from "@/app/agendar/[slug]/actions";
import {
  formatarBRL,
  formatarDuracao,
  type Bloqueio,
  type ProfissionalPublico,
  type ServicoPublico,
} from "@/lib/agendar-publico";

const initialState: AgendarPublicoState = { ok: false };

type Props = {
  slug:          string;
  servicos:      ServicoPublico[];
  profissionais: ProfissionalPublico[];
  bloqueios:     Bloqueio[];
};

/**
 * Calcula próximo slot de 30 em 30 min, no futuro, formato datetime-local
 */
function proximoSlot(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  if (d.getMinutes() < 30) {
    d.setMinutes(30);
  } else {
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AgendarForm({ slug, servicos, profissionais, bloqueios }: Props) {
  const action = criarAgendamentoPublico.bind(null, slug);
  const [state, formAction, isPending] = useActionState(action, initialState);

  const [servicoId, setServicoId]           = useState(state.values?.servico_id || "");
  const [profissionalId, setProfissionalId] = useState(state.values?.profissional_id || "");

  // Profissionais disponíveis: filtra os bloqueados pelo serviço escolhido
  const profissionaisDisponiveis = useMemo(() => {
    if (!servicoId) return profissionais;
    const bloqueados = new Set(
      bloqueios.filter((b) => b.servico_id === servicoId).map((b) => b.profissional_id),
    );
    return profissionais.filter((p) => !bloqueados.has(p.id));
  }, [servicoId, profissionais, bloqueios]);

  const servicoSelecionado = servicos.find((s) => s.id === servicoId);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {/* Serviço */}
      <Field error={state.fieldErrors?.servico_id}>
        <Label htmlFor="servico_id">Qual serviço você quer?</Label>
        <SelectStyled
          id="servico_id"
          name="servico_id"
          required
          value={servicoId}
          onChange={(e) => {
            setServicoId(e.target.value);
            // Se profissional atual não atende o novo serviço, limpa
            const novosBloqueados = new Set(
              bloqueios.filter((b) => b.servico_id === e.target.value).map((b) => b.profissional_id),
            );
            if (profissionalId && novosBloqueados.has(profissionalId)) {
              setProfissionalId("");
            }
          }}
          ariaInvalid={!!state.fieldErrors?.servico_id}
        >
          <option value="" disabled>Selecione...</option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} · {formatarBRL(s.preco)} · {formatarDuracao(s.duracao_minutos)}
            </option>
          ))}
        </SelectStyled>
        {servicoSelecionado?.descricao && (
          <p className="text-xs text-on-surface-variant mt-2">
            {servicoSelecionado.descricao}
          </p>
        )}
      </Field>

      {/* Profissional */}
      <Field error={state.fieldErrors?.profissional_id}>
        <Label htmlFor="profissional_id">
          Com qual profissional?
          {servicoId && profissionaisDisponiveis.length < profissionais.length && (
            <span className="text-xs text-outline ml-2">(quem atende esse serviço)</span>
          )}
        </Label>
        <SelectStyled
          id="profissional_id"
          name="profissional_id"
          required
          value={profissionalId}
          onChange={(e) => setProfissionalId(e.target.value)}
          disabled={!servicoId}
          ariaInvalid={!!state.fieldErrors?.profissional_id}
        >
          <option value="" disabled>
            {servicoId ? "Selecione..." : "Escolha um serviço primeiro"}
          </option>
          {profissionaisDisponiveis.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </SelectStyled>
      </Field>

      {/* Data e hora */}
      <Field error={state.fieldErrors?.data_hora_inicio}>
        <Label htmlFor="data_hora_inicio">Para quando?</Label>
        <input
          id="data_hora_inicio"
          name="data_hora_inicio"
          type="datetime-local"
          required
          defaultValue={state.values?.data_hora_inicio || proximoSlot()}
          aria-invalid={!!state.fieldErrors?.data_hora_inicio || undefined}
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: state.fieldErrors?.data_hora_inicio
              ? "1px solid var(--color-error)"
              : "1px solid rgba(255,255,255,0.1)",
          }}
        />
      </Field>

      {/* Dados do cliente */}
      <div className="space-y-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <p className="text-xs uppercase tracking-wider text-outline">Seus dados</p>

        <Field error={state.fieldErrors?.cliente_nome}>
          <Label htmlFor="cliente_nome">Seu nome</Label>
          <input
            id="cliente_nome"
            name="cliente_nome"
            type="text"
            required
            autoComplete="name"
            placeholder="Ex: Maria Silva"
            defaultValue={state.values?.cliente_nome ?? ""}
            maxLength={100}
            aria-invalid={!!state.fieldErrors?.cliente_nome || undefined}
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: state.fieldErrors?.cliente_nome
                ? "1px solid var(--color-error)"
                : "1px solid rgba(255,255,255,0.1)",
            }}
          />
        </Field>

        <Field error={state.fieldErrors?.cliente_telefone}>
          <Label htmlFor="cliente_telefone">WhatsApp (com DDD)</Label>
          <input
            id="cliente_telefone"
            name="cliente_telefone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            placeholder="(**) *****-****"
            defaultValue={state.values?.cliente_telefone ?? ""}
            maxLength={11}
            aria-invalid={!!state.fieldErrors?.cliente_telefone || undefined}
            onBeforeInput={(e) => {
              const data = (e as unknown as InputEvent).data;
              if (data && !/^\d+$/.test(data)) e.preventDefault();
            }}
            onInput={(e) => {
              const t = e.currentTarget;
              const cleaned = t.value.replace(/\D/g, "").slice(0, 11);
              if (cleaned !== t.value) t.value = cleaned;
            }}
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: state.fieldErrors?.cliente_telefone
                ? "1px solid var(--color-error)"
                : "1px solid rgba(255,255,255,0.1)",
            }}
          />
          <p className="text-xs text-on-surface-variant mt-1.5">
            Usaremos esse número para identificar você.
          </p>
        </Field>

        <Field error={state.fieldErrors?.cliente_email}>
          <Label htmlFor="cliente_email" optional>E-mail</Label>
          <input
            id="cliente_email"
            name="cliente_email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            defaultValue={state.values?.cliente_email ?? ""}
            maxLength={100}
            aria-invalid={!!state.fieldErrors?.cliente_email || undefined}
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: state.fieldErrors?.cliente_email
                ? "1px solid var(--color-error)"
                : "1px solid rgba(255,255,255,0.1)",
            }}
          />
          <p className="text-xs text-on-surface-variant mt-1.5">
            Receba lembretes do seu agendamento por e-mail também.
          </p>
        </Field>
      </div>

      {/* Observações */}
      <Field>
        <Label htmlFor="observacoes" optional>Observações</Label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={2}
          maxLength={500}
          placeholder="Algum detalhe importante para o seu atendimento?"
          defaultValue={state.values?.observacoes ?? ""}
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant resize-none"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        />
      </Field>

      {/* Mensagem geral de erro */}
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

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-bold transition-all-custom disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg,#E8D080,#C89933)",
          color: "#1D1A05",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>event_available</span>
        {isPending ? "Confirmando..." : "Confirmar agendamento"}
      </button>
    </form>
  );
}

/* ── Subcomponentes ─────────────────────────────────── */

function Field({
  children,
  error,
}: {
  children: React.ReactNode;
  error?:   string;
}) {
  return (
    <div>
      {children}
      {error && (
        <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function Label({
  children,
  htmlFor,
  optional,
}: {
  children:  React.ReactNode;
  htmlFor:   string;
  optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-on-surface mb-1.5">
      {children}
      {optional && <span className="text-outline"> (opcional)</span>}
    </label>
  );
}

function SelectStyled({
  id,
  name,
  required,
  value,
  onChange,
  disabled,
  ariaInvalid,
  children,
}: {
  id:           string;
  name:         string;
  required?:    boolean;
  value:        string;
  onChange:     React.ChangeEventHandler<HTMLSelectElement>;
  disabled?:    boolean;
  ariaInvalid?: boolean;
  children:     React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={ariaInvalid || undefined}
        className="w-full px-4 py-3 pr-10 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: ariaInvalid
            ? "1px solid var(--color-error)"
            : "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {children}
      </select>
      <span
        className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
        style={{ fontSize: "20px" }}
      >
        expand_more
      </span>
    </div>
  );
}
