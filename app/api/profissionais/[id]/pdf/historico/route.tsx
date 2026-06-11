import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { carregarHistoricoCompleto } from "@/lib/folha-pagamento";
import { HistoricoPdf } from "@/components/profissionais/historico-pdf";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  // Nome do salão para o cabeçalho do PDF
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

  const historico = await carregarHistoricoCompleto(supabase, id);
  if (!historico) return new Response("Profissional não encontrado", { status: 404 });

  const buffer = await renderToBuffer(
    <HistoricoPdf nomeSalao={salaoNome} historico={historico} />,
  );

  const safeName = historico.profissional.nome.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const dataHoje = new Date().toISOString().slice(0, 10);
  const filename = `historico-${safeName}-${dataHoje}.pdf`;

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}
