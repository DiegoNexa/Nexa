"use client";

import { useState, useMemo } from "react";
import { alternarAtivoCliente } from "@/app/(app)/clientes/actions";

export type Cliente = {
  id:            string;
  nome:          string;
  telefone:      string | null;
  email:         string | null;
  ultima_visita: string | null;
  ativo:         boolean;
};

function formatarTelefone(t: string | null): string {
  if (!t) return "—";
  // 11 dígitos: (11) 99999-9999 | 10 dígitos: (11) 9999-9999
  if (t.length === 11) return `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}`;
  if (t.length === 10) return `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}`;
  return t;
}

function formatarDataRelativa(iso: string | null): string {
  if (!iso) return "Nunca atendida";
  const data = new Date(iso);
  const agora = new Date();
  const diasAtras = Math.floor((agora.getTime() - data.getTime()) / 86400000);

  if (diasAtras < 1)  return "Hoje";
  if (diasAtras < 2)  return "Ontem";
  if (diasAtras < 30) return `Há ${diasAtras} dias`;
  if (diasAtras < 60) return "Mês passado";
  if (diasAtras < 365) {
    const meses = Math.floor(diasAtras / 30);
    return `Há ${meses} ${meses === 1 ? "mês" : "meses"}`;
  }
  const anos = Math.floor(diasAtras / 365);
  return `Há ${anos} ${anos === 1 ? "ano" : "anos"}`;
}

export function ClientesLista({ clientes }: { clientes: Cliente[] }) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => {
      if (c.nome.toLowerCase().includes(q)) return true;
      if (c.telefone?.includes(q)) return true;
      if (c.email?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [clientes, busca]);

  return (
    <>
      {/* Busca */}
      <div className="relative mb-4">
        <span
          className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
          style={{ fontSize: "20px" }}
        >
          search
        </span>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, telefone ou e-mail"
          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all-custom text-on-surface placeholder-on-surface-variant"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        />
      </div>

      {/* Resultado vazio da busca */}
      {filtrados.length === 0 && busca && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-on-surface-variant">
            Nenhum cliente encontrado para <strong className="text-on-surface">"{busca}"</strong>
          </p>
        </div>
      )}

      {/* Lista */}
      {filtrados.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {filtrados.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-4 p-4 md:p-5 ${c.ativo ? "" : "opacity-50"}`}
              >
                {/* Avatar */}
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{
                    background: "rgba(200,153,51,0.12)",
                    color: "var(--color-primary)",
                  }}
                >
                  {c.nome.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-on-surface truncate">{c.nome}</h3>
                    {!c.ativo && (
                      <span className="text-[10px] uppercase tracking-wider text-outline">inativo</span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant truncate">
                    {formatarTelefone(c.telefone)}
                    {c.email && <span className="ml-2">· {c.email}</span>}
                  </p>
                </div>

                {/* Última visita */}
                <div className="hidden sm:flex flex-col items-end gap-0.5 mr-2">
                  <span className="text-xs text-outline uppercase tracking-wider">Última visita</span>
                  <span className="text-sm text-on-surface-variant">
                    {formatarDataRelativa(c.ultima_visita)}
                  </span>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1">
                  <a
                    href={`/clientes/${c.id}`}
                    aria-label="Editar"
                    className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all-custom"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>edit</span>
                  </a>
                  <form action={alternarAtivoCliente.bind(null, c.id, c.ativo)}>
                    <button
                      type="submit"
                      aria-label={c.ativo ? "Desativar" : "Ativar"}
                      className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all-custom"
                      title={c.ativo ? "Desativar cliente" : "Ativar cliente"}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                        {c.ativo ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
