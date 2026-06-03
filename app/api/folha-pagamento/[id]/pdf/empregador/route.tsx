import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { carregarFolha, parseMesParam } from "@/lib/folha-pagamento";
import { FolhaPdfEmpregador } from "@/components/folha-pagamento/folha-pdf-empregador";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const url = new URL(request.url);
  const mesParam = url.searchParams.get("mes") ?? undefined;
  const periodo = parseMesParam(mesParam);

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  const { data: u } = await supabase
    .from("usuarios")
    .select("saloes ( nome )")
    .eq("id", user.id)
    .maybeSingle<{ saloes: { nome: string } | { nome: string }[] | null }>();

  const salaoNome = (() => {
    const v = u?.saloes;
    if (!v) return "Salão";
    if (Array.isArray(v)) return v[0]?.nome ?? "Salão";
    return v.nome;
  })();

  const folha = await carregarFolha(supabase, id, periodo);
  if (!folha) return new Response("Profissional não encontrado", { status: 404 });

  const buffer = await renderToBuffer(
    <FolhaPdfEmpregador nomeSalao={salaoNome} folha={folha} />,
  );

  const safeName = folha.profissional.nome.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const filename = `folha-${safeName}-${periodo.inicio.slice(0, 7)}.pdf`;

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}
