import type { ReactNode } from "react";

/**
 * Layout de leitura para páginas legais (Termos, Privacidade).
 * Prosa clara sobre o tema escuro, com um aviso de que o texto é
 * um modelo base a ser revisado juridicamente.
 */
export function LegalLayout({
  titulo,
  atualizadoEm,
  children,
}: {
  titulo:       string;
  atualizadoEm: string;
  children:     ReactNode;
}) {
  return (
    <main className="min-h-screen" style={{ background: "var(--color-surface, #0E0C02)" }}>
      <div className="max-w-3xl mx-auto px-5 py-12 md:py-16">
        <a
          href="/"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-all-custom mb-8"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_back</span>
          Voltar ao início
        </a>

        <h1
          className="text-3xl md:text-4xl font-bold text-on-surface mb-2"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          {titulo}
        </h1>
        <p className="text-sm text-on-surface-variant mb-8">
          Última atualização: {atualizadoEm}
        </p>

        <div
          className="rounded-xl px-4 py-3 mb-8 text-xs"
          style={{ background: "rgba(200,153,51,0.06)", border: "1px solid rgba(200,153,51,0.2)", color: "var(--color-on-surface-variant)" }}
        >
          Este documento é um modelo base. Antes do lançamento comercial, recomenda-se
          revisão por assessoria jurídica para adequá-lo à sua realidade.
        </div>

        <div className="legal-prose space-y-4 text-sm leading-relaxed text-on-surface-variant">
          {children}
        </div>
      </div>

      {/* Estiliza os títulos de seção sem depender de plugin de tipografia */}
      <style>{`
        .legal-prose h2 {
          color: var(--color-on-surface);
          font-weight: 700;
          font-size: 1.05rem;
          margin-top: 1.75rem;
          margin-bottom: 0.25rem;
        }
        .legal-prose strong { color: var(--color-on-surface); }
      `}</style>
    </main>
  );
}
