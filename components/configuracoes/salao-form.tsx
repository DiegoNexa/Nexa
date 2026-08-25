"use client";

import { useActionState } from "react";
import { HoverButton } from "@/components/ui/hover-button";
import { atualizarSalao, type ConfigState } from "@/app/(app)/configuracoes/actions";

const initialState: ConfigState = { ok: false };

type Props = {
  nome:              string;
  telefoneWhatsapp:  string | null;
  documento:         string | null;
  podeEditar:        boolean;
};

export function SalaoForm({ nome, telefoneWhatsapp, documento, podeEditar }: Props) {
  const [state, formAction, isPending] = useActionState(atualizarSalao, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-on-surface mb-1.5">
          Nome do salão
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          maxLength={80}
          defaultValue={nome}
          disabled={!podeEditar}
          aria-invalid={state.fieldErrors?.nome ? "true" : undefined}
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface disabled:opacity-50"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: state.fieldErrors?.nome ? "1px solid var(--color-error)" : "1px solid rgba(255,255,255,0.1)",
          }}
        />
        {state.fieldErrors?.nome && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>{state.fieldErrors.nome}</p>
        )}
      </div>

      <div>
        <label htmlFor="telefone_whatsapp" className="block text-sm font-medium text-on-surface mb-1.5">
          WhatsApp <span className="text-outline">(opcional)</span>
        </label>
        <input
          id="telefone_whatsapp"
          name="telefone_whatsapp"
          type="tel"
          inputMode="numeric"
          maxLength={11}
          placeholder="(00) 00000-0000"
          defaultValue={telefoneWhatsapp ?? ""}
          disabled={!podeEditar}
          aria-invalid={state.fieldErrors?.telefone_whatsapp ? "true" : undefined}
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant disabled:opacity-50"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: state.fieldErrors?.telefone_whatsapp ? "1px solid var(--color-error)" : "1px solid rgba(255,255,255,0.1)",
          }}
        />
        {state.fieldErrors?.telefone_whatsapp && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>{state.fieldErrors.telefone_whatsapp}</p>
        )}
        <p className="text-xs text-on-surface-variant mt-1.5">Só números, com DDD.</p>
      </div>

      <div>
        <label htmlFor="documento" className="block text-sm font-medium text-on-surface mb-1.5">
          CPF ou CNPJ
        </label>
        <input
          id="documento"
          name="documento"
          type="text"
          inputMode="numeric"
          maxLength={14}
          placeholder="Somente números"
          defaultValue={documento ?? ""}
          disabled={!podeEditar}
          aria-invalid={state.fieldErrors?.documento ? "true" : undefined}
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant disabled:opacity-50"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: state.fieldErrors?.documento ? "1px solid var(--color-error)" : "1px solid rgba(255,255,255,0.1)",
          }}
        />
        {state.fieldErrors?.documento && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>{state.fieldErrors.documento}</p>
        )}
        <p className="text-xs text-on-surface-variant mt-1.5">
          Necessário para emitir a cobrança da assinatura.
        </p>
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

      {podeEditar ? (
        <HoverButton type="submit" disabled={isPending} className="w-full">
          {isPending ? "Salvando..." : "Salvar alterações"}
        </HoverButton>
      ) : (
        <p className="text-xs text-on-surface-variant">
          Apenas o dono do salão pode editar estes dados.
        </p>
      )}
    </form>
  );
}
