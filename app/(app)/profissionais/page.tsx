import { createClient } from "@/lib/supabase/server";
import { GoldBorderButton } from "@/components/ui/gold-border-button";
import { alternarAtivoProfissional } from "./actions";

type Profissional = {
  id:              string;
  nome:            string;
  telefone:        string | null;
  cor:             string | null;
  comissao_padrao: number;
  ativo:           boolean;
};

function formatarTelefone(t: string | null): string {
  if (!t) return "—";
  if (t.length === 11) return `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}`;
  if (t.length === 10) return `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}`;
  return t;
}

export default async function ProfissionaisPage() {
  const supabase = await createClient();
  const { data: profissionais } = await supabase
    .from("profissionais")
    .select("id, nome, telefone, cor, comissao_padrao, ativo")
    .order("ativo", { ascending: false })
    .order("nome")
    .returns<Profissional[]>();

  const lista = profissionais ?? [];

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <p
            className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
            style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
          >
            Equipe
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-on-surface mb-1"
            style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
          >
            Profissionais
          </h1>
          <p className="text-sm text-on-surface-variant">
            {lista.length === 0
              ? "Cadastre quem atende no seu salão"
              : `${lista.length} ${lista.length === 1 ? "profissional" : "profissionais"} na equipe`}
          </p>
        </div>

        <GoldBorderButton href="/profissionais/novo" className="inline-flex">
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
          Novo profissional
        </GoldBorderButton>
      </div>

      {lista.length === 0 ? <ProfissionaisEmpty /> : <ProfissionaisLista profissionais={lista} />}
    </div>
  );
}

function ProfissionaisEmpty() {
  return (
    <div className="glass-card rounded-3xl p-8 md:p-16 text-center max-w-2xl mx-auto">
      <span
        className="material-symbols-outlined text-primary block mx-auto mb-6"
        style={{ fontSize: "72px" }}
      >
        content_cut
      </span>
      <h2
        className="text-2xl md:text-3xl font-bold text-on-surface mb-3"
        style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
      >
        Nenhum profissional ainda
      </h2>
      <p className="text-base text-on-surface-variant max-w-md mx-auto mb-8">
        Cadastre quem atende no seu salão. Você poderá definir carga horária e comissão por serviço logo em seguida.
      </p>
      <GoldBorderButton href="/profissionais/novo" className="inline-flex">
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
        Cadastrar primeiro profissional
      </GoldBorderButton>
    </div>
  );
}

function ProfissionaisLista({ profissionais }: { profissionais: Profissional[] }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {profissionais.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-4 p-4 md:p-5 ${p.ativo ? "" : "opacity-50"}`}
          >
            {/* Avatar circular com a cor + inicial */}
            <div
              className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm text-white"
              style={{
                background: p.cor ?? "var(--color-primary-container)",
                border: "2px solid rgba(255,255,255,0.1)",
              }}
            >
              {p.nome.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-on-surface truncate">{p.nome}</h3>
                {!p.ativo && (
                  <span className="text-[10px] uppercase tracking-wider text-outline">inativo</span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant truncate">
                {formatarTelefone(p.telefone)}
                <span className="ml-2">· Comissão padrão {p.comissao_padrao}%</span>
              </p>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-1">
              <a
                href={`/profissionais/${p.id}`}
                aria-label="Editar"
                className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all-custom"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>edit</span>
              </a>
              <form action={alternarAtivoProfissional.bind(null, p.id, p.ativo)}>
                <button
                  type="submit"
                  aria-label={p.ativo ? "Desativar" : "Ativar"}
                  className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all-custom"
                  title={p.ativo ? "Desativar profissional" : "Ativar profissional"}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                    {p.ativo ? "visibility_off" : "visibility"}
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
