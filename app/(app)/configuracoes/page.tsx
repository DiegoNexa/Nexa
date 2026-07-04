import { createClient } from "@/lib/supabase/server";
import { SalaoForm } from "@/components/configuracoes/salao-form";
import { LinkPublicoCopy } from "@/components/configuracoes/link-publico-copy";

type Salao = {
  id:                string;
  nome:              string;
  slug:              string;
  telefone_whatsapp: string | null;
};

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("salao_id, email, role")
    .eq("id", user!.id)
    .single<{ salao_id: string; email: string; role: string }>();

  const { data: salao } = await supabase
    .from("saloes")
    .select("id, nome, slug, telefone_whatsapp")
    .eq("id", usuario?.salao_id ?? "")
    .single<Salao>();

  const podeEditar = usuario?.role === "dono";

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-2xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <p
          className="text-xs font-medium tracking-widest text-primary uppercase mb-2"
          style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
        >
          Configurações
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold text-on-surface mb-1"
          style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          Ajustes do salão
        </h1>
        <p className="text-sm text-on-surface-variant">
          Dados do salão, link público de agendamento e conta
        </p>
      </div>

      <div className="space-y-6">
        {/* Link público */}
        {salao && (
          <section className="glass-card rounded-2xl p-5 md:p-6">
            <h2 className="text-sm font-semibold text-on-surface mb-1">Link público de agendamento</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Compartilhe com seus clientes para que agendem sozinhos, sem precisar de login.
            </p>
            <LinkPublicoCopy slug={salao.slug} />
          </section>
        )}

        {/* Dados do salão */}
        {salao && (
          <section className="glass-card rounded-2xl p-5 md:p-6">
            <h2 className="text-sm font-semibold text-on-surface mb-4">Dados do salão</h2>
            <SalaoForm
              nome={salao.nome}
              telefoneWhatsapp={salao.telefone_whatsapp}
              podeEditar={podeEditar}
            />
          </section>
        )}

        {/* Conta */}
        <section className="glass-card rounded-2xl p-5 md:p-6">
          <h2 className="text-sm font-semibold text-on-surface mb-4">Conta</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-on-surface-variant">E-mail de acesso</span>
              <span className="text-sm text-on-surface font-medium truncate">{usuario?.email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-on-surface-variant">Perfil</span>
              <span className="text-sm text-on-surface font-medium">
                {usuario?.role === "dono" ? "Dono" : "Colaborador"}
              </span>
            </div>
            <div className="pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <a
                href="/recuperar-senha"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>lock_reset</span>
                Trocar senha
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
