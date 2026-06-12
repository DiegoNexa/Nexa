"use client";

import { mudarStatusAgendamento, excluirAgendamento } from "@/app/(app)/agenda/actions";

type Props = {
  id:            string;
  statusAtual:   string;
  podeCancelar:  boolean;
};

type Acao = {
  status:   "confirmado" | "concluido" | "falta" | "cancelado";
  label:    string;
  icon:     string;
  cor:      string;
  bg:       string;
  destaque?: boolean;
};

const ACOES: Acao[] = [
  { status: "confirmado", label: "Confirmar",  icon: "check_circle",      cor: "#34D399", bg: "rgba(52,211,153,0.10)" },
  { status: "concluido",  label: "Concluir",   icon: "task_alt",          cor: "#C89933", bg: "rgba(200,153,51,0.12)", destaque: true },
  { status: "falta",      label: "Marcar falta", icon: "person_off",      cor: "#EF4444", bg: "rgba(239,68,68,0.10)" },
  { status: "cancelado",  label: "Cancelar",   icon: "cancel",            cor: "#9CA3AF", bg: "rgba(156,163,175,0.10)" },
];

export function StatusActions({ id, statusAtual, podeCancelar }: Props) {
  // Filtra ações: não mostra a que já é o status atual nem opções inválidas
  const acoesDisponiveis = ACOES.filter((a) => {
    if (a.status === statusAtual) return false;
    if (a.status === "cancelado" && !podeCancelar) return false;
    return true;
  });

  if (acoesDisponiveis.length === 0) return null;

  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-outline mb-2">Ações rápidas</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {acoesDisponiveis.map((a) => (
          <form key={a.status} action={mudarStatusAgendamento.bind(null, id, a.status)}>
            <button
              type="submit"
              onClick={(e) => {
                if (a.status === "cancelado") {
                  if (!confirm("Cancelar este agendamento?")) e.preventDefault();
                }
                if (a.status === "concluido") {
                  if (!confirm("Marcar como concluído? Isso vai aparecer na folha de pagamento do profissional.")) {
                    e.preventDefault();
                  }
                }
              }}
              className={`w-full flex flex-col items-center gap-1 px-3 py-3 rounded-xl text-xs font-semibold transition-all-custom hover:brightness-110 ${
                a.destaque ? "border-2" : "border"
              }`}
              style={{
                background: a.bg,
                color: a.cor,
                borderColor: a.destaque ? a.cor : "rgba(255,255,255,0.08)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                {a.icon}
              </span>
              {a.label}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

export function ExcluirAgendamentoButton({ id, status }: { id: string; status: string }) {
  // Concluídos não podem ser excluídos (estão na folha histórica)
  if (status === "concluido") return null;

  return (
    <form action={excluirAgendamento.bind(null, id)}>
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm("Excluir definitivamente este agendamento? Esta ação não pode ser desfeita.")) {
            e.preventDefault();
          }
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all-custom"
        style={{
          background: "rgba(255, 180, 171, 0.08)",
          border: "1px solid var(--color-error)",
          color: "var(--color-error)",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>delete</span>
        Excluir agendamento
      </button>
    </form>
  );
}
