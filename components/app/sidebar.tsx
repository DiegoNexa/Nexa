"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type NavItem = {
  href:    string;
  label:   string;
  icon:    string;
  enabled: boolean;
};

type SidebarProps = {
  primeiroNome?: string;
  nomeSalao:     string;
  logoutForm:    React.ReactNode;
};

const NAV: NavItem[] = [
  { href: "/dashboard",      label: "Dashboard",     icon: "dashboard",        enabled: true  },
  { href: "/agenda",         label: "Agenda",        icon: "calendar_today",   enabled: true  },
  { href: "/clientes",       label: "Clientes",      icon: "groups",           enabled: true  },
  { href: "/profissionais",  label: "Profissionais", icon: "content_cut",      enabled: true  },
  { href: "/servicos",       label: "Serviços",      icon: "design_services",  enabled: true  },
  { href: "/folha-pagamento",label: "Folha",         icon: "receipt_long",     enabled: true  },
  { href: "/estoque",        label: "Estoque",       icon: "inventory_2",      enabled: true  },
  { href: "/financeiro",     label: "Financeiro",    icon: "payments",         enabled: false },
  { href: "/configuracoes",  label: "Configurações", icon: "settings",         enabled: false },
];

export function Sidebar({ primeiroNome, nomeSalao, logoutForm }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Hamburger mobile */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
        style={{ background: "rgba(29,26,5,0.85)", backdropFilter: "blur(12px)" }}
        aria-label="Abrir menu"
      >
        <span className="material-symbols-outlined text-on-surface" style={{ fontSize: "24px" }}>
          menu
        </span>
      </button>

      {/* Backdrop mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 z-40
          h-screen w-64 flex-shrink-0
          flex flex-col
          border-r
          transition-transform duration-300
          md:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{
          background:   "rgba(14,12,2,0.95)",
          borderColor:  "rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Logo */}
        <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <a href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Nexa" width={480} height={519} className="h-8 w-auto block" priority />
            <span
              className="text-lg font-bold text-on-surface"
              style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
            >
              Nexa
            </span>
          </a>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {NAV.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const baseStyle = {
                color: active ? "var(--color-primary)" : "var(--color-on-surface-variant)",
                background: active ? "rgba(200,153,51,0.08)" : "transparent",
                border: active ? "1px solid rgba(200,153,51,0.2)" : "1px solid transparent",
              };

              if (!item.enabled) {
                return (
                  <li key={item.href}>
                    <div
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm opacity-40 cursor-not-allowed"
                      title="Em breve"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-outline">
                        soon
                      </span>
                    </div>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all-custom hover:text-on-surface"
                    style={baseStyle}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer com identificação do salão + sair.
            Nome do salão é o identificador principal (contexto B2B).
            Primeiro nome do usuário aparece em cima quando disponível. */}
        <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="mb-3">
            {primeiroNome && (
              <p className="text-xs text-on-surface-variant truncate" title={primeiroNome}>
                {primeiroNome}
              </p>
            )}
            <p className="text-sm font-semibold text-on-surface truncate" title={nomeSalao}>
              {nomeSalao}
            </p>
          </div>
          {logoutForm}
        </div>
      </aside>
    </>
  );
}
