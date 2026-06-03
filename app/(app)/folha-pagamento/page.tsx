import { createClient } from "@/lib/supabase/server";
import { MesSelector } from "@/components/folha-pagamento/mes-selector";
import { BRL, carregarFolha, parseMesParam } from "@/lib/folha-pagamento";

type Profissional = {
  id:              string;
  nome:            string;
  cor:             string | null;
  comissao_padrao: number;
  salario_fixo:    number;
  ativo:           boolean;
};

type Props = {
  searchParams: Promise<{ mes?: string }>;
};

export default async function FolhaPagamentoPage({ searchParams }: Props) {
  const { mes } = await searchParams;
  const periodo = parseMesParam(mes);

  const supabase = await createClient();
  const { data: profissionais } = await supabase
    .from("profissionais")
    .select("id, nome, cor, comissao_padrao, salario_fixo, ativo")
    .eq("ativo", true)
    .order("nome")
    .returns<Profissional[]>();

  const lista = profissionais ?? [];

  // Carrega folha de cada profissional em paralelo
  const folhas = await Promise.all(
    lista.map((p) => carregarFolha(supabase, p.id, periodo)),
  );

  const totalGeral = folhas.reduce((s, f) => s + (f?.totais.liquido ?? 0), 0);

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <p
            className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
            style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
          >
            Financeiro
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-on-surface mb-1"
            style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
          >
            Folha de pagamento
          </h1>
          <p className="text-sm text-on-surface-variant">{periodo.label}</p>
        </div>

        <MesSelector />
      </div>

      {lista.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="glass-card rounded-2xl overflow-hidden mb-4">
            {/* Header da tabela — esconde em mobile */}
            <div
              className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 text-[10px] uppercase tracking-wider text-outline border-b"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div>Profissional</div>
              <div className="text-right">Salário</div>
              <div className="text-right">Movimentos</div>
              <div className="text-right" />
              <div className="text-right">Líquido</div>
              <div className="w-20" />
            </div>

            {folhas.map((f, i) => {
              const p = lista[i];
              if (!f) return null;
              return <LinhaProfissional key={p.id} prof={p} folha={f} />;
            })}

            {/* Total geral */}
            <div
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 border-t md:items-center"
              style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(200,153,51,0.04)" }}
            >
              <div className="font-bold text-on-surface col-span-5 md:col-span-1">TOTAL DA FOLHA</div>
              <div className="hidden md:block" />
              <div className="hidden md:block" />
              <div className="hidden md:block" />
              <div className="text-right md:text-right text-lg font-bold text-primary col-span-5 md:col-span-1 md:col-start-5">
                {BRL.format(totalGeral)}
              </div>
              <div className="w-20" />
            </div>
          </div>

          <p className="text-xs text-outline text-center">
            Use o seletor de mês acima para visualizar períodos anteriores. Movimentos podem ser editados na tela de detalhe.
          </p>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-card rounded-3xl p-8 md:p-16 text-center max-w-2xl mx-auto">
      <span
        className="material-symbols-outlined text-primary block mx-auto mb-6"
        style={{ fontSize: "72px" }}
      >
        receipt_long
      </span>
      <h2
        className="text-2xl md:text-3xl font-bold text-on-surface mb-3"
        style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
      >
        Nenhum profissional ativo
      </h2>
      <p className="text-base text-on-surface-variant max-w-md mx-auto mb-8">
        Cadastre profissionais e marque agendamentos como concluídos para a folha começar a aparecer aqui.
      </p>
      <a
        href="/profissionais/novo"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-on-primary"
        style={{ background: "linear-gradient(135deg,#E8D080,#C89933)" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
        Cadastrar profissional
      </a>
    </div>
  );
}

function LinhaProfissional({
  prof,
  folha,
}: {
  prof:  Profissional;
  folha: NonNullable<Awaited<ReturnType<typeof carregarFolha>>>;
}) {
  const { totais } = folha;
  return (
    <div
      className="grid grid-cols-[2fr_auto] md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 border-b items-center"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
    >
      {/* Profissional */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white"
          style={{
            background: prof.cor ?? "var(--color-primary-container)",
            border: "2px solid rgba(255,255,255,0.1)",
          }}
        >
          {prof.nome.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-on-surface truncate">{prof.nome}</p>
          <p className="text-xs text-on-surface-variant md:hidden">
            {folha.atendimentos.length} atendimento(s) · {BRL.format(totais.liquido)} líquido
          </p>
        </div>
      </div>

      {/* Colunas desktop */}
      <div className="hidden md:block text-right text-sm text-on-surface-variant">
        {totais.salario_fixo > 0 ? BRL.format(totais.salario_fixo) : "—"}
      </div>
      <div className="hidden md:block text-right text-sm">
        <p className="text-on-surface-variant">{BRL.format(totais.movimentos_adicionais)}</p>
        <p className="text-[10px] text-outline">
          {BRL.format(totais.comissao_bruta)} comissão
          {totais.descontos > 0 && ` − ${BRL.format(totais.descontos)}`}
          {totais.bonus > 0 && ` + ${BRL.format(totais.bonus)}`}
        </p>
      </div>
      <div className="hidden md:block" />
      <div className="hidden md:block text-right">
        <p className="text-sm font-bold text-primary">{BRL.format(totais.liquido)}</p>
      </div>

      {/* Ação: ver detalhe */}
      <a
        href={`/folha-pagamento/${prof.id}?mes=${folha.periodo.inicio.slice(0, 7)}`}
        className="px-3 py-2 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all-custom whitespace-nowrap"
      >
        Detalhes →
      </a>
    </div>
  );
}
