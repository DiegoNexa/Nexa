"use client";

import { useEffect, useState } from "react";

/**
 * Mostra o link público de agendamento e permite copiar. Monta a URL
 * absoluta a partir da origem atual (funciona em local e produção).
 */
export function LinkPublicoCopy({ slug }: { slug: string }) {
  const [copiado, setCopiado] = useState(false);
  const [url, setUrl] = useState(`/agendar/${slug}`);

  // Ao montar no cliente, troca pro link absoluto
  useEffect(() => {
    setUrl(`${window.location.origin}/agendar/${slug}`);
  }, [slug]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback silencioso — usuário pode copiar manualmente
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 min-w-0 px-4 py-3 rounded-xl text-sm text-on-surface font-mono"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        />
        <button
          type="button"
          onClick={copiar}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all-custom"
          style={{ background: "linear-gradient(135deg,#E8D080,#C89933)", color: "#1D1A05" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
            {copiado ? "check" : "content_copy"}
          </span>
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
      <a
        href={`/agendar/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>open_in_new</span>
        Abrir página de agendamento
      </a>
    </div>
  );
}
