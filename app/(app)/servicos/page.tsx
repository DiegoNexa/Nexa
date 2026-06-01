import { createClient } from "@/lib/supabase/server";
import { GoldBorderButton } from "@/components/ui/gold-border-button";
import { alternarAtivoServico } from "./actions";

type Servico = {
  id:              string;
  nome:            string;
  descricao:       string | null;
  duracao_minutos: number;
  preco:           number;
  ativo:           boolean;
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function ServicosPage() {
  const supabase = await createClient();
  const { data: servicos } = await supabase
    .from("servicos")
    .select("id, nome, descricao, duracao_minutos, preco, ativo")
    .order("ativo",  { ascending: false })
    .order("nome")
    .returns<Servico[]>();

  const lista = servicos ?? [];

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <p
            className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
            style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
          >
            Catálogo
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-on-surface mb-1"
            style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
          >
            Serviços
          </h1>
          <p className="text-sm text-on-surface-variant">
            Cadastre os serviços que seu salão oferece
          </p>
        </div>

        <GoldBorderButton href="/servicos/novo" className="inline-flex">
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
          Novo serviço
        </GoldBorderButton>
      </div>

      {/* Lista ou empty state */}
      {lista.length === 0 ? <ServicosEmpty /> : <ServicosLista servicos={lista} />}
    </div>
  );
}

function ServicosEmpty() {
  return (
    <div className="glass-card rounded-3xl p-8 md:p-16 text-center max-w-2xl mx-auto">
      <span
        className="material-symbols-outlined text-primary block mx-auto mb-6"
        style={{ fontSize: "72px" }}
      >
        design_services
      </span>
      <h2
        className="text-2xl md:text-3xl font-bold text-on-surface mb-3"
        style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
      >
        Nenhum serviço ainda
      </h2>
      <p className="text-base text-on-surface-variant max-w-md mx-auto mb-8">
        Cadastre os serviços que você oferece (corte, escova, manicure, etc) para começar a usar a agenda.
      </p>
      <GoldBorderButton href="/servicos/novo" className="inline-flex">
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
        Cadastrar primeiro serviço
      </GoldBorderButton>
    </div>
  );
}

function ServicosLista({ servicos }: { servicos: Servico[] }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {servicos.map((s) => (
          <div
            key={s.id}
            className={`flex items-center gap-4 p-4 md:p-5 ${s.ativo ? "" : "opacity-50"}`}
          >
            {/* Ícone */}
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(200,153,51,0.12)" }}
            >
              <span className="material-symbols-outlined text-primary" style={{ fontSize: "20px" }}>
                design_services
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-on-surface truncate">{s.nome}</h3>
                {!s.ativo && (
                  <span className="text-[10px] uppercase tracking-wider text-outline">inativo</span>
                )}
              </div>
              {s.descricao && (
                <p className="text-xs text-on-surface-variant truncate mt-0.5">{s.descricao}</p>
              )}
            </div>

            {/* Métricas */}
            <div className="hidden sm:flex flex-col items-end gap-0.5 mr-2">
              <span className="text-sm font-semibold text-on-surface">
                {BRL.format(s.preco)}
              </span>
              <span className="text-xs text-on-surface-variant">
                {s.duracao_minutos} min
              </span>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-1">
              <a
                href={`/servicos/${s.id}`}
                aria-label="Editar"
                className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all-custom"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>edit</span>
              </a>
              <form action={alternarAtivoServico.bind(null, s.id, s.ativo)}>
                <button
                  type="submit"
                  aria-label={s.ativo ? "Desativar" : "Ativar"}
                  className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all-custom"
                  title={s.ativo ? "Desativar serviço" : "Ativar serviço"}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                    {s.ativo ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
