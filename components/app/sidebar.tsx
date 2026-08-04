"use client";

import { useEffect, useState } from "react";
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
  logoutAction:  () => void | Promise<void>;
};

const NAV: NavItem[] = [
  { href: "/dashboard",      label: "Dashboard",     icon: "dashboard",        enabled: true  },
  { href: "/agenda",         label: "Agenda",        icon: "calendar_today",   enabled: true  },
  { href: "/clientes",       label: "Clientes",      icon: "groups",           enabled: true  },
  { href: "/profissionais",  label: "Profissionais", icon: "content_cut",      enabled: true  },
  { href: "/carga-horaria",  label: "Carga horária", icon: "schedule",         enabled: true  },
  { href: "/ranking",        label: "Ranking",       icon: "leaderboard",      enabled: true  },
  { href: "/servicos",       label: "Serviços",      icon: "design_services",  enabled: true  },
  { href: "/folha-pagamento",label: "Folha",         icon: "receipt_long",     enabled: true  },
  { href: "/estoque",        label: "Estoque",       icon: "inventory_2",      enabled: true  },
  { href: "/financeiro",     label: "Financeiro",    icon: "payments",         enabled: true  },
  { href: "/configuracoes",  label: "Configurações", icon: "settings",         enabled: true  },
];

const STORAGE_KEY = "nexa-sidebar-collapsed";

export function Sidebar({ primeiroNome, nomeSalao, logoutAction }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed]   = useState(false);

  // Restaura o estado de colapso salvo (só desktop). Aplica após o
  // mount pra evitar mismatch de hidratação.
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  // Classe utilitária: esconde no desktop quando colapsado (mantém no mobile)
  const hideOnCollapse = collapsed ? "md:hidden" : "";

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
          h-screen flex-shrink-0
          flex flex-col
          border-r
          transition-all duration-300
          w-64 ${collapsed ? "md:w-20" : "md:w-64"}
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
          <a
            href="/dashboard"
            className={`flex items-center gap-2 ${collapsed ? "md:justify-center" : ""}`}
          >
            <Image src="/logo.png" alt="Nexa" width={480} height={519} className="h-8 w-auto block" priority />
            <span
              className={`text-lg font-bold text-on-surface ${hideOnCollapse}`}
              style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
            >
              Nexa
            </span>
          </a>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-hidden">
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
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm opacity-40 cursor-not-allowed ${collapsed ? "md:justify-center md:px-0" : ""}`}
                      title="Em breve"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                        {item.icon}
                      </span>
                      <span className={hideOnCollapse}>{item.label}</span>
                      <span className={`ml-auto text-[10px] uppercase tracking-wider text-outline ${hideOnCollapse}`}>
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
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all-custom hover:text-on-surface ${collapsed ? "md:justify-center md:px-0" : ""}`}
                    style={baseStyle}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      {item.icon}
                    </span>
                    <span className={hideOnCollapse}>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Toggle recolher/expandir (só desktop) */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className={`hidden md:flex items-center gap-3 px-3 py-3 border-t text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all-custom ${collapsed ? "justify-center px-0" : ""}`}
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <span
            className="material-symbols-outlined transition-transform duration-300"
            style={{ fontSize: "20px", transform: collapsed ? "rotate(180deg)" : "none" }}
          >
            chevron_left
          </span>
          <span className={`text-sm font-medium ${hideOnCollapse}`}>Recolher</span>
        </button>

        {/* Footer: identificação do salão + sair */}
        <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className={`mb-3 ${hideOnCollapse}`}>
            {primeiroNome && (
              <p className="text-xs text-on-surface-variant truncate" title={primeiroNome}>
                {primeiroNome}
              </p>
            )}
            <p className="text-sm font-semibold text-on-surface truncate" title={nomeSalao}>
              {nomeSalao}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sair"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-on-surface transition-all-custom"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>logout</span>
              <span className={hideOnCollapse}>Sair</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
