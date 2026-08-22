import { avisoAssinatura, type EstadoAssinatura, type NivelAviso } from "@/lib/planos";

/**
 * Faixa de aviso da assinatura, exibida no topo do dashboard.
 *
 * Server component sem estado: se não há nada a avisar (assinatura
 * ativa ou trial folgado), não renderiza nada — evita virar ruído
 * permanente na tela.
 */

const ESTILO: Record<NivelAviso, { cor: string; icone: string }> = {
  info:    { cor: "#60A5FA",              icone: "info" },
  atencao: { cor: "var(--color-primary)", icone: "schedule" },
  critico: { cor: "#EF4444",              icone: "error" },
};

export function AvisoAssinatura({ salao }: { salao: EstadoAssinatura }) {
  const aviso = avisoAssinatura(salao);
  if (!aviso) return null;

  const { cor, icone } = ESTILO[aviso.nivel];

  return (
    <div
      className="rounded-2xl px-4 py-3 mb-6 flex items-center gap-3 flex-wrap"
      style={{ background: `${cor}14`, border: `1px solid ${cor}55` }}
      role={aviso.nivel === "critico" ? "alert" : undefined}
    >
      <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: "22px", color: cor }}>
        {icone}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: cor }}>
          {aviso.titulo}
        </p>
        <p className="text-xs text-on-surface-variant mt-0.5">{aviso.texto}</p>
      </div>

      <a
        href="/configuracoes"
        className="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all-custom whitespace-nowrap"
        style={{ background: cor, color: "#1D1A05" }}
      >
        {aviso.cta}
      </a>
    </div>
  );
}
