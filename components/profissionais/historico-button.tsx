type Props = {
  id:   string;
  nome: string;
};

/**
 * Card que oferece o download do histórico no salão em PDF.
 * Usado em casos de demissão, acordo, ou arquivo pessoal do
 * profissional. Contém TODOS os atendimentos e movimentos desde
 * a data de admissão.
 */
export function HistoricoButton({ id, nome }: Props) {
  return (
    <div className="glass-card rounded-2xl p-5 md:p-6 mt-6">
      <div className="flex items-start gap-3 mb-4">
        <span
          className="material-symbols-outlined flex-shrink-0 text-primary"
          style={{ fontSize: "24px" }}
        >
          description
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-on-surface mb-1">Histórico no salão</h3>
          <p className="text-sm text-on-surface-variant">
            Baixe um relatório completo com todos os atendimentos, comissões,
            descontos e bônus de <strong className="text-on-surface">{nome}</strong>
            {" "}desde a admissão. Útil em casos de demissão, rescisão ou
            arquivo pessoal.
          </p>
        </div>
      </div>

      <a
        href={`/api/profissionais/${id}/pdf/historico`}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all-custom"
        style={{
          background: "linear-gradient(135deg,#E8D080,#C89933)",
          color: "#1D1A05",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
          download
        </span>
        Baixar histórico em PDF
      </a>

      <p className="text-xs text-outline mt-3 text-center">
        Para ocultar o profissional sem perder o histórico, use o botão de
        desativar na lista.
      </p>
    </div>
  );
}
