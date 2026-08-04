import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/sidebar";
import { logoutAction } from "./dashboard/actions";

/**
 * Layout compartilhado de toda a área autenticada do app.
 *
 * Responsabilidades:
 *   1. Auth guard centralizado (todas as rotas dentro de (app)
 *      ficam atrás dele — não precisamos repetir o check)
 *   2. Busca uma única vez os dados do usuário + nome do salão
 *      e passa pro Sidebar
 *   3. Renderiza sidebar fixa + área principal scroll-friendly
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, role, saloes(nome)")
    .eq("id", user.id)
    .single<{ nome: string; role: string; saloes: { nome: string } | null }>();

  // Primeiro nome do usuário (extraído do nome completo cadastrado)
  // e nome do salão. NÃO usamos email como fallback — o sidebar
  // mostra apenas o salão se o usuário não tiver nome registrado.
  const primeiroNome = usuario?.nome?.split(" ")[0];
  const nomeSalao    = usuario?.saloes?.nome ?? "Salão";

  // Aurora background — fica fixo atrás de toda a área autenticada
  return (
    <div className="min-h-screen flex">
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 animate-aurora"
          style={{ background: "var(--color-primary-container)", top: "-200px", left: "-200px" }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-15 animate-aurora"
          style={{ background: "var(--color-secondary-container)", bottom: "-200px", right: "-200px", animationDelay: "-7.5s" }}
        />
      </div>

      <Sidebar
        primeiroNome={primeiroNome}
        nomeSalao={nomeSalao}
        logoutAction={logoutAction}
      />

      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
