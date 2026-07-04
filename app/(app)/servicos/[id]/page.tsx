import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ServicoForm } from "@/components/servicos/servico-form";
import { ConsumoProdutosForm } from "@/components/servicos/consumo-produtos-form";
import { atualizarServico } from "../actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarServicoPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: servico }, { data: produtos }, { data: vinculos }] = await Promise.all([
    supabase
      .from("servicos")
      .select("id, nome, descricao, duracao_minutos, preco")
      .eq("id", id)
      .single<{
        id:              string;
        nome:            string;
        descricao:       string | null;
        duracao_minutos: number;
        preco:           number;
      }>(),
    supabase
      .from("produtos")
      .select("id, nome, unidade")
      .eq("ativo", true)
      .order("nome")
      .returns<{ id: string; nome: string; unidade: string }[]>(),
    supabase
      .from("servico_produtos")
      .select("produto_id, quantidade")
      .eq("servico_id", id)
      .returns<{ produto_id: string; quantidade: number }[]>(),
  ]);

  if (!servico) notFound();

  const consumo: Record<string, number> = {};
  for (const v of vinculos ?? []) consumo[v.produto_id] = v.quantidade;

  // Server Action curried com o id — assinatura (prev, formData) preservada
  const updateAction = atualizarServico.bind(null, servico.id);

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-2xl mx-auto">
      <div className="mb-6">
        <a
          href="/servicos"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-all-custom mb-4"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_back</span>
          Voltar
        </a>
        <p
          className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
          style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
        >
          Editar
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold text-on-surface mb-1"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          {servico.nome}
        </h1>
        <p className="text-sm text-on-surface-variant">
          Atualize os dados do serviço
        </p>
      </div>

      <ServicoForm
        action={updateAction}
        initial={{
          nome:            servico.nome,
          descricao:       servico.descricao,
          duracao_minutos: servico.duracao_minutos,
          preco:           servico.preco,
        }}
        submitLabel="Salvar alterações"
        pendingLabel="Salvando..."
      />

      {/* Consumo de estoque (baixa automática ao concluir) */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-on-surface mb-3">Consumo de estoque</h2>
        <ConsumoProdutosForm servicoId={servico.id} produtos={produtos ?? []} consumo={consumo} />
      </div>
    </div>
  );
}
