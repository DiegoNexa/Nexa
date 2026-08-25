"use client";

import { useActionState } from "react";
import { salvarDadosCobranca, type ConfigState } from "@/app/(app)/configuracoes/actions";

const initialState: ConfigState = { ok: false };

/**
 * Coleta CPF/CNPJ e WhatsApp na própria tela de bloqueio.
 *
 * O AbacatePay exige esses dados para emitir a cobrança, e um salão
 * bloqueado não consegue chegar em Configurações — então o formulário
 * precisa viver aqui, senão o dono fica sem caminho para assinar.
 */
export function DadosCobrancaForm({
  documento, telefone,
}: {
  documento: string | null;
  telefone:  string | null;
}) {
  const [state, formAction, isPending] = useActionState(salvarDadosCobranca, initialState);

  return (
    <form
      action={formAction}
      className="rounded-2xl p-5 mb-6"
      style={{ background: "rgba(200,153,51,0.06)", border: "1px solid rgba(200,153,51,0.25)" }}
      noValidate
    >
      <div className="flex items-start gap-2 mb-4">
        <span className="material-symbols-outlined text-primary flex-shrink-0" style={{ fontSize: "20px" }}>
          badge
        </span>
        <div>
          <p className="text-sm font-semibold text-on-surface">Complete seus dados de cobrança</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Exigidos para emitir a cobrança. Só é necessário uma vez.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="documento" className="block text-xs font-medium text-on-surface mb-1.5">
            CPF ou CNPJ
          </label>
          <input
            id="documento"
            name="documento"
            type="text"
            inputMode="numeric"
            maxLength={14}
            required
            placeholder="Somente números"
            defaultValue={documento ?? ""}
            aria-invalid={state.fieldErrors?.documento ? "true" : undefined}
            className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: state.fieldErrors?.documento
                ? "1px solid var(--color-error)"
                : "1px solid rgba(255,255,255,0.1)",
            }}
          />
          {state.fieldErrors?.documento && (
            <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>
              {state.fieldErrors.documento}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="telefone_whatsapp" className="block text-xs font-medium text-on-surface mb-1.5">
            WhatsApp
          </label>
          <input
            id="telefone_whatsapp"
            name="telefone_whatsapp"
            type="tel"
            inputMode="numeric"
            maxLength={11}
            required
            placeholder="DDD + número"
            defaultValue={telefone ?? ""}
            aria-invalid={state.fieldErrors?.telefone_whatsapp ? "true" : undefined}
            className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: state.fieldErrors?.telefone_whatsapp
                ? "1px solid var(--color-error)"
                : "1px solid rgba(255,255,255,0.1)",
            }}
          />
          {state.fieldErrors?.telefone_whatsapp && (
            <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>
              {state.fieldErrors.telefone_whatsapp}
            </p>
          )}
        </div>
      </div>

      {state.message && (
        <div
          role="alert"
          className="rounded-xl px-4 py-2.5 text-sm mt-3"
          style={{
            background: state.ok ? "rgba(52,211,153,0.10)" : "rgba(255,180,171,0.08)",
            border:     state.ok ? "1px solid #34D399" : "1px solid var(--color-error)",
            color:      state.ok ? "#34D399" : "var(--color-error)",
          }}
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all-custom disabled:opacity-50"
        style={{ background: "linear-gradient(135deg,#E8D080,#C89933)", color: "#1D1A05" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check</span>
        {isPending ? "Salvando..." : "Salvar dados"}
      </button>
    </form>
  );
}
