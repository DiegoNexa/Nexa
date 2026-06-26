import { createClient } from "@/lib/supabase/server";
import { GoldBorderButton } from "@/components/ui/gold-border-button";
import { alternarAtivoProduto } from "./actions";

type Produto = {
  id:                string;
  nome:              string;
  descricao:         string | null;
  unidade:           string;
  quantidade:        number;
  quantidade_minima: number;
  preco_custo:       number | null;
  ativo:             boolean;
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Formata número sem casas desnecessárias (10,00 → 10 · 2,50 → 2,5)
function fmtQtd(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function estoqueBaixo(p: Produto): boolean {
  return p.ativo && p.quantidade <= p.quantidade_minima;
}

export default async function EstoquePage() {
  const supabase = await createClient();
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome, descricao, unidade, quantidade, quantidade_minima, preco_custo, ativo")
    .order("ativo", { ascending: false })
    .order("nome")
    .returns<Produto[]>();

  const lista = produtos ?? [];
  const alertas = lista.filter(estoqueBaixo);

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <p
            className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
            style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
          >
            Insumos
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-on-surface mb-1"
            style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
          >
            Estoque
          </h1>
          <p className="text-sm text-on-surface-variant">
            Controle os produtos e insumos do seu salão
          </p>
        </div>

        <GoldBorderButton href="/estoque/novo" className="inline-flex">
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
          Novo produto
        </GoldBorderButton>
      </div>

      {/* Alerta de estoque baixo */}
      {alertas.length > 0 && (
        <div
          className="rounded-2xl px-4 py-3 mb-6 flex items-start gap-3"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: "22px", color: "#EF4444" }}>
            warning
          </span>
          <div className="text-sm">
            <p className="font-semibold" style={{ color: "#EF4444" }}>
              {alertas.length === 1
                ? "1 produto com estoque baixo"
                : `${alertas.length} produtos com estoque baixo`}
            </p>
            <p className="text-on-surface-variant mt-0.5">
              {alertas.map((p) => p.nome).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Lista ou empty state */}
      {lista.length === 0 ? <EstoqueEmpty /> : <ProdutosLista produtos={lista} />}
    </div>
  );
}

function EstoqueEmpty() {
  return (
    <div className="glass-card rounded-3xl p-8 md:p-16 text-center max-w-2xl mx-auto">
      <span
        className="material-symbols-outlined text-primary block mx-auto mb-6"
        style={{ fontSize: "72px" }}
      >
        inventory_2
      </span>
      <h2
        className="text-2xl md:text-3xl font-bold text-on-surface mb-3"
        style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
      >
        Nenhum produto ainda
      </h2>
      <p className="text-base text-on-surface-variant max-w-md mx-auto mb-8">
        Cadastre os produtos e insumos que você usa (shampoo, tintas, descartáveis) para controlar o estoque e receber alertas.
      </p>
      <GoldBorderButton href="/estoque/novo" className="inline-flex">
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
        Cadastrar primeiro produto
      </GoldBorderButton>
    </div>
  );
}

function ProdutosLista({ produtos }: { produtos: Produto[] }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {produtos.map((p) => {
          const baixo = estoqueBaixo(p);
          return (
            <div
              key={p.id}
              className={`flex items-center gap-4 p-4 md:p-5 ${p.ativo ? "" : "opacity-50"}`}
            >
              {/* Ícone */}
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: baixo ? "rgba(239,68,68,0.12)" : "rgba(200,153,51,0.12)" }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "20px", color: baixo ? "#EF4444" : "var(--color-primary)" }}
                >
                  inventory_2
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-on-surface truncate">{p.nome}</h3>
                  {!p.ativo && (
                    <span className="text-[10px] uppercase tracking-wider text-outline">inativo</span>
                  )}
                  {baixo && (
                    <span
                      className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}
                    >
                      estoque baixo
                    </span>
                  )}
                </div>
                {p.descricao && (
                  <p className="text-xs text-on-surface-variant truncate mt-0.5">{p.descricao}</p>
                )}
              </div>

              {/* Métricas */}
              <div className="hidden sm:flex flex-col items-end gap-0.5 mr-2">
                <span
                  className="text-sm font-semibold"
                  style={{ color: baixo ? "#EF4444" : "var(--color-on-surface)" }}
                >
                  {fmtQtd(p.quantidade)} {p.unidade}
                </span>
                <span className="text-xs text-on-surface-variant">
                  mín. {fmtQtd(p.quantidade_minima)}
                  {p.preco_custo != null && ` · ${BRL.format(p.preco_custo)}`}
                </span>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1">
                <a
                  href={`/estoque/${p.id}`}
                  aria-label="Gerenciar"
                  className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all-custom"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>tune</span>
                </a>
                <form action={alternarAtivoProduto.bind(null, p.id, p.ativo)}>
                  <button
                    type="submit"
                    aria-label={p.ativo ? "Desativar" : "Ativar"}
                    title={p.ativo ? "Desativar produto" : "Ativar produto"}
                    className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all-custom"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      {p.ativo ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
