"use client";

import { useActionState } from "react";
import { HoverButton } from "@/components/ui/hover-button";
import type { ProfissionalState } from "@/app/(app)/profissionais/actions";

const initialState: ProfissionalState = { ok: false };

const CORES_SUGERIDAS = [
  "#C89933", "#E8D080", "#8B6B1F",  // dourados (linha Nexa)
  "#3B82F6", "#10B981", "#EF4444",  // azul, verde, vermelho
  "#A855F7", "#EC4899", "#F97316",  // roxo, rosa, laranja
];

type ProfissionalFormProps = {
  action: (prev: ProfissionalState, formData: FormData) => Promise<ProfissionalState>;
  initial?: {
    nome?:            string;
    telefone?:        string | null;
    cor?:             string | null;
    comissao_padrao?: number;
  };
  submitLabel?:  string;
  pendingLabel?: string;
};

export function ProfissionalForm({
  action,
  initial,
  submitLabel  = "Salvar profissional",
  pendingLabel = "Salvando...",
}: ProfissionalFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  const v = (k: keyof NonNullable<ProfissionalState["values"]>) => state.values?.[k] ?? "";

  const initNome     = v("nome")            || initial?.nome            || "";
  const initTelefone = v("telefone")        || initial?.telefone        || "";
  const initCor      = v("cor")             || initial?.cor             || "#C89933";
  const initComissao = v("comissao_padrao") || initial?.comissao_padrao?.toString() || "50";

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field
        label="Nome completo"
        name="nome"
        placeholder="Ex: Ana Costa"
        defaultValue={initNome}
        error={state.fieldErrors?.nome}
        required
      />

      {/* WhatsApp — só dígitos */}
      <div>
        <label htmlFor="telefone" className="block text-sm font-medium text-on-surface mb-1.5">
          WhatsApp <span className="text-outline">(opcional)</span>
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(**) *****-****"
          defaultValue={initTelefone}
          maxLength={11}
          aria-invalid={state.fieldErrors?.telefone ? "true" : undefined}
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
            border: state.fieldErrors?.telefone
              ? "1px solid var(--color-error)"
              : "1px solid rgba(255,255,255,0.1)",
          }}
        />
        {state.fieldErrors?.telefone && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
            {state.fieldErrors.telefone}
          </p>
        )}
      </div>

      {/* Cor — seletor + paleta */}
      <div>
        <label htmlFor="cor" className="block text-sm font-medium text-on-surface mb-1.5">
          Cor no calendário <span className="text-outline">(opcional)</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            id="cor"
            name="cor"
            type="color"
            defaultValue={initCor}
            className="h-12 w-16 rounded-xl cursor-pointer flex-shrink-0"
            style={{
              background: "transparent",
              border: state.fieldErrors?.cor
                ? "1px solid var(--color-error)"
                : "1px solid rgba(255,255,255,0.1)",
            }}
          />
          <div className="flex flex-wrap gap-2">
            {CORES_SUGERIDAS.map((cor) => (
              <button
                key={cor}
                type="button"
                aria-label={`Cor ${cor}`}
                onClick={(e) => {
                  const input = (e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement | null);
                  if (input) input.value = cor;
                }}
                className="w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110"
                style={{ background: cor, border: "1px solid rgba(255,255,255,0.2)" }}
              />
            ))}
          </div>
        </div>
        {state.fieldErrors?.cor && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
            {state.fieldErrors.cor}
          </p>
        )}
      </div>

      {/* Comissão padrão */}
      <div>
        <label htmlFor="comissao_padrao" className="block text-sm font-medium text-on-surface mb-1.5">
          Comissão padrão (%)
        </label>
        <p className="text-xs text-on-surface-variant mb-2">
          Aplicada a todos os serviços. Pode ser sobrescrita por serviço específico abaixo.
        </p>
        <div className="relative max-w-[200px]">
          <input
            id="comissao_padrao"
            name="comissao_padrao"
            type="text"
            inputMode="decimal"
            placeholder="50"
            defaultValue={initComissao}
            required
            aria-invalid={state.fieldErrors?.comissao_padrao ? "true" : undefined}
            className="w-full px-4 py-3 pr-10 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: state.fieldErrors?.comissao_padrao
                ? "1px solid var(--color-error)"
                : "1px solid rgba(255,255,255,0.1)",
            }}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-sm">
            %
          </span>
        </div>
        {state.fieldErrors?.comissao_padrao && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
            {state.fieldErrors.comissao_padrao}
          </p>
        )}
      </div>

      {/* Feedback */}
      {state.message && !state.fieldErrors && (
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
        {isPending ? pendingLabel : submitLabel}
      </HoverButton>
    </form>
  );
}

/* ── Field ──────────────────────────────────────────────── */
type FieldProps = {
  label:        string;
  name:         string;
  type?:        string;
  placeholder?: string;
  defaultValue?: string;
  error?:       string;
  required?:    boolean;
};

function Field({ label, name, type = "text", placeholder, defaultValue, error, required }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-on-surface mb-1.5">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={error ? "true" : undefined}
        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: error
            ? "1px solid var(--color-error)"
            : "1px solid rgba(255,255,255,0.1)",
        }}
      />
      {error && (
        <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
