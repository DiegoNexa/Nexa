import { ProdutoForm } from "@/components/estoque/produto-form";
import { criarProduto } from "../actions";

export default function NovoProdutoPage() {
  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-2xl mx-auto">
      <div className="mb-6">
        <a
          href="/estoque"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-all-custom mb-4"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_back</span>
          Voltar
        </a>
        <p
          className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
          style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
        >
          Novo cadastro
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold text-on-surface mb-1"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          Cadastrar produto
        </h1>
        <p className="text-sm text-on-surface-variant">
          Adicione um produto ou insumo ao estoque
        </p>
      </div>

      <ProdutoForm action={criarProduto} submitLabel="Cadastrar produto" pendingLabel="Cadastrando..." />
    </div>
  );
}
