import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProdutoForm } from "@/components/estoque/produto-form";
import { MovimentoForm } from "@/components/estoque/movimento-form";
import { atualizarProduto } from "../actions";

type Props = { params: Promise<{ id: string }> };

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

type Movimento = {
  id:         string;
  tipo:       "entrada" | "saida";
  quantidade: number;
  motivo:     string | null;
  created_at: string;
};

function fmtQtd(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function fmtDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function ProdutoDetalhePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: produto }, { data: movimentos }] = await Promise.all([
    supabase
      .from("produtos")
      .select("id, nome, descricao, unidade, quantidade, quantidade_minima, preco_custo, ativo")
      .eq("id", id)
      .single<Produto>(),
    supabase
      .from("movimentos_estoque")
      .select("id, tipo, quantidade, motivo, created_at")
      .eq("produto_id", id)
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<Movimento[]>(),
  ]);

  if (!produto) notFound();

  const baixo = produto.quantidade <= produto.quantidade_minima;
  const lista = movimentos ?? [];

  const updateAction = atualizarProduto.bind(null, produto.id);

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-2xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <a
          href="/estoque"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-all-custom mb-4"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_back</span>
          Voltar para estoque
        </a>
        <p
          className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
          style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
        >
          Produto
        </p>
        <h1
          className="text-2xl md:text-3xl font-bold text-on-surface mb-1"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          {produto.nome}
        </h1>
      </div>

      {/* Saldo atual */}
      <div
        className="glass-card rounded-2xl p-5 mb-6 flex items-center justify-between"
        style={baixo ? { border: "1px solid rgba(239,68,68,0.3)" } : undefined}
      >
        <div>
          <p className="text-xs uppercase tracking-wider text-outline mb-1">Saldo atual</p>
          <p
            className="text-3xl font-bold"
            style={{ color: baixo ? "#EF4444" : "var(--color-on-surface)" }}
          >
            {fmtQtd(produto.quantidade)} <span className="text-lg font-medium">{produto.unidade}</span>
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            Estoque mínimo: {fmtQtd(produto.quantidade_minima)} {produto.unidade}
          </p>
        </div>
        {baixo && (
          <span
            className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded"
            style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}
          >
            estoque baixo
          </span>
        )}
      </div>

      {/* Movimentação */}
      <div className="glass-card rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-on-surface mb-3">Registrar movimento</h2>
        <MovimentoForm produtoId={produto.id} unidade={produto.unidade} />
      </div>

      {/* Histórico */}
      <div className="glass-card rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-on-surface mb-3">Histórico recente</h2>
        {lista.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Nenhuma movimentação ainda.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {lista.map((m) => {
              const entrada = m.tipo === "entrada";
              return (
                <div key={m.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="material-symbols-outlined flex-shrink-0"
                    style={{ fontSize: "20px", color: entrada ? "#34D399" : "#EF4444" }}
                  >
                    {entrada ? "south_west" : "north_east"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-on-surface">
                      {entrada ? "Entrada" : "Saída"} de {fmtQtd(m.quantidade)} {produto.unidade}
                    </p>
                    {m.motivo && (
                      <p className="text-xs text-on-surface-variant truncate">{m.motivo}</p>
                    )}
                  </div>
                  <span className="text-xs text-on-surface-variant flex-shrink-0">
                    {fmtDataHora(m.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editar dados do produto */}
      <h2 className="text-sm font-semibold text-on-surface mb-3">Editar dados</h2>
      <ProdutoForm
        action={updateAction}
        modoEdicao
        initial={{
          nome:              produto.nome,
          descricao:         produto.descricao,
          unidade:           produto.unidade,
          quantidade_minima: produto.quantidade_minima,
          preco_custo:       produto.preco_custo,
        }}
        submitLabel="Salvar alterações"
        pendingLabel="Salvando..."
      />
    </div>
  );
}
