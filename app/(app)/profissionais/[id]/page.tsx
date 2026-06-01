import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfissionalForm } from "@/components/profissionais/profissional-form";
import { CargaHorariaForm } from "@/components/profissionais/carga-horaria-form";
import { ComissoesConfigForm } from "@/components/profissionais/comissoes-config-form";
import { DeleteProfissionalButton } from "@/components/profissionais/delete-profissional-button";
import { atualizarProfissional } from "../actions";

type Props = {
  params: Promise<{ id: string }>;
};

type Profissional = {
  id:              string;
  nome:            string;
  telefone:        string | null;
  cor:             string | null;
  comissao_padrao: number;
};

type Carga = {
  dia_semana:  number;
  hora_inicio: string;
  hora_fim:    string;
};

type Servico = {
  id:    string;
  nome:  string;
  preco: number;
};

type ComissaoOverride = {
  servico_id: string;
  percentual: number;
};

export default async function EditarProfissionalPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  // Busca em paralelo: profissional + carga + comissões config + serviços + stats
  const [
    { data: profissional },
    { data: cargaHoraria },
    { data: comissoes },
    { data: servicos },
    { count: totalAtendimentos },
  ] = await Promise.all([
    supabase
      .from("profissionais")
      .select("id, nome, telefone, cor, comissao_padrao")
      .eq("id", id)
      .single<Profissional>(),
    supabase
      .from("carga_horaria")
      .select("dia_semana, hora_inicio, hora_fim")
      .eq("profissional_id", id)
      .returns<Carga[]>(),
    supabase
      .from("comissoes_config")
      .select("servico_id, percentual")
      .eq("profissional_id", id)
      .returns<ComissaoOverride[]>(),
    supabase
      .from("servicos")
      .select("id, nome, preco")
      .eq("ativo", true)
      .order("nome")
      .returns<Servico[]>(),
    supabase
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("profissional_id", id)
      .eq("status", "concluido"),
  ]);

  if (!profissional) notFound();

  const updateAction = atualizarProfissional.bind(null, profissional.id);

  // Mapa de overrides pra passar pro form
  const overridesMap: Record<string, number> = {};
  for (const c of comissoes ?? []) {
    overridesMap[c.servico_id] = c.percentual;
  }

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-3xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <a
          href="/profissionais"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-all-custom mb-4"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_back</span>
          Voltar
        </a>

        <div className="flex items-center gap-4 mb-2">
          <div
            className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg text-white"
            style={{
              background: profissional.cor ?? "var(--color-primary-container)",
              border: "2px solid rgba(255,255,255,0.1)",
            }}
          >
            {profissional.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <p
              className="text-xs font-medium tracking-widest text-primary uppercase mb-1"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
            >
              Editar profissional
            </p>
            <h1
              className="text-2xl md:text-3xl font-bold text-on-surface"
              style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
            >
              {profissional.nome}
            </h1>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant">
          {totalAtendimentos ?? 0} {(totalAtendimentos ?? 0) === 1 ? "atendimento concluído" : "atendimentos concluídos"}
        </p>
      </div>

      {/* Seção 1: Dados básicos */}
      <Section title="Dados básicos" icon="badge" defaultOpen>
        <ProfissionalForm
          action={updateAction}
          initial={{
            nome:            profissional.nome,
            telefone:        profissional.telefone,
            cor:             profissional.cor,
            comissao_padrao: profissional.comissao_padrao,
          }}
          submitLabel="Salvar dados"
          pendingLabel="Salvando..."
        />
      </Section>

      {/* Seção 2: Carga horária */}
      <Section title="Carga horária" icon="schedule">
        <p className="text-sm text-on-surface-variant mb-4">
          Marque os dias da semana em que o profissional trabalha e defina o horário de início e fim.
        </p>
        <CargaHorariaForm profissionalId={profissional.id} initial={cargaHoraria ?? []} />
      </Section>

      {/* Seção 3: Comissões */}
      <Section title="Comissões por serviço" icon="payments">
        <ComissoesConfigForm
          profissionalId={profissional.id}
          servicos={servicos ?? []}
          comissaoPadrao={profissional.comissao_padrao}
          overrides={overridesMap}
        />
      </Section>

      {/* Zona de risco */}
      <DeleteProfissionalButton id={profissional.id} nome={profissional.nome} />
    </div>
  );
}

/* ── Seção colapsável (CSS-only via details/summary) ────── */
function Section({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title:        string;
  icon:         string;
  defaultOpen?: boolean;
  children:     React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="glass-card rounded-2xl mb-4 overflow-hidden group"
    >
      <summary
        className="px-5 py-4 cursor-pointer flex items-center gap-3 select-none list-none"
        style={{ listStyle: "none" }}
      >
        <span className="material-symbols-outlined text-primary" style={{ fontSize: "22px" }}>
          {icon}
        </span>
        <h2
          className="text-lg font-bold text-on-surface flex-1"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          {title}
        </h2>
        <span
          className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180"
          style={{ fontSize: "22px" }}
        >
          keyboard_arrow_down
        </span>
      </summary>
      <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="pt-4">{children}</div>
      </div>
    </details>
  );
}
