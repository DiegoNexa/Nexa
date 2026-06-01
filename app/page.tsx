"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { LampContainer } from "@/components/ui/lamp";
import { GoldBorderButton } from "@/components/ui/gold-border-button";
import { GlowCard } from "@/components/ui/spotlight-card";

type Period = "mensal" | "semestral" | "anual";

const PERIODS: { key: Period; label: string; badge?: string }[] = [
  { key: "anual",     label: "Anual",     badge: "-30%" },
  { key: "semestral", label: "Semestral", badge: "-15%" },
  { key: "mensal",    label: "Mensal" },
];

const nexaPlans = [
  {
    name: "Solo",
    tag: "Plano Solo",
    professionals: "1 profissional",
    price: { mensal: 49, semestral: 42, anual: 34 },
    description: "Para autônomas que querem organizar a agenda e automatizar o WhatsApp.",
    popular: false,
    features: ["Agenda completa", "WhatsApp com IA", "Lembretes automáticos", "Avisos de retorno", "Estoque básico", "Relatórios básicos", "Link público de agendamento"],
    support: "Suporte por e-mail",
    buttonText: "Começar grátis",
  },
  {
    name: "Profissional",
    tag: "Mais Popular",
    professionals: "Até 5 profissionais",
    price: { mensal: 99, semestral: 84, anual: 69 },
    description: "O mais escolhido por salões que precisam de comissões, equipe e relatórios.",
    popular: true,
    features: ["Tudo do Solo", "Gestão de equipe", "Comissões automáticas", "Relatórios completos", "Aniversariantes"],
    support: "Suporte por chat",
    buttonText: "Teste 30 dias grátis",
  },
  {
    name: "Premium",
    tag: "Plano Pro",
    professionals: "Profissionais ilimitados",
    price: { mensal: 199, semestral: 169, anual: 139 },
    description: "Para salões consolidados com múltiplas unidades e gestão profissional.",
    popular: false,
    features: ["Tudo do Profissional", "Relatórios avançados"],
    support: "Suporte prioritário",
    buttonText: "Começar grátis",
  },
];

const objectives = [
  { icon: "schedule",     title: "Otimize seu Tempo",         desc: "Automatize agendamentos via WhatsApp com IA e libere sua atenção para o que importa." },
  { icon: "favorite",     title: "Fidelize seu Cliente",      desc: "Reengajamento automático, lembretes e mensagens de aniversário para manter a frequência." },
  { icon: "trending_up",  title: "Aumente seu Faturamento",   desc: "Reduza faltas, aumente agendamentos e tenha controle financeiro completo." },
];

const features = [
  { icon: "calendar_today", title: "Agenda Inteligente",    desc: "Dia, semana e mês. Link público para o cliente agendar sozinho." },
  { icon: "smart_toy",      title: "WhatsApp com IA",        desc: "A IA agenda automaticamente — sem você tocar no celular." },
  { icon: "add_shopping_cart", title: "Overbump no Checkout", desc: "Sugere produtos na hora do pagamento. Aumenta o ticket médio do atendimento sem esforço." },
  { icon: "notifications",  title: "Lembretes de Horário",   desc: "Confirmação e lembrete automático enviados antes do horário." },
  { icon: "forum",          title: "Mensagens de Retorno",   desc: "Dispara reengajamento para clientes sumidos via WhatsApp." },
  { icon: "inventory_2",    title: "Gestão de Estoque",      desc: "Baixa automática ao registrar serviço. Alerta de estoque mínimo." },
  { icon: "payments",       title: "Gestão Financeira",      desc: "Receitas, despesas, comissões automáticas e relatórios." },
  { icon: "group",          title: "Gestão de Equipe",       desc: "Carga horária, comissões por serviço e extrato individual." },
  { icon: "bar_chart",      title: "Relatórios Gerenciais",  desc: "Acompanhe faturamento e desempenho em tempo real." },
];

const personas = [
  { icon: "content_cut",      title: "Autônoma",           tag: "Solo",              desc: "Trabalha sozinha, usa WhatsApp para marcar horários. Quer praticidade, não complexidade.", plan: "Plano Solo · R$49/mês",         popular: false },
  { icon: "business_center",  title: "Salão de Bairro",    tag: "2 a 5 profissionais", desc: "Dono acumula função de atendente e gestor. Precisa controlar comissões e reduzir faltas.", plan: "Plano Profissional · R$99/mês", popular: true  },
  { icon: "emoji_events",     title: "Salão Consolidado",  tag: "6+ profissionais",  desc: "Clientela fiel. Quer relatórios, metas e gestão profissional completa.",                   plan: "Plano Premium · R$199/mês",    popular: false },
];

const steps = [
  { n: "01", title: "Faça o Cadastro",       desc: "Crie sua conta com os dados básicos do seu estabelecimento. Leva menos de 2 minutos." },
  { n: "02", title: "Configure seu Salão",   desc: "Informe os serviços, profissionais e jornada de trabalho. O passo a passo guia você." },
  { n: "03", title: "Teste por 30 dias",     desc: "Usufrua de todas as funcionalidades gratuitamente. Sem cartão de crédito." },
];

const faqs = [
  { q: "O que é a Nexa?",                           a: "A Nexa é um sistema de gestão completo para salões de beleza, com agenda inteligente, IA no WhatsApp, controle financeiro, gestão de equipe e muito mais — em uma única plataforma." },
  { q: "Como funciona e o que a Nexa soluciona?",   a: "A Nexa organiza agenda, clientes, estoque e finanças em uma só plataforma, com uma IA no WhatsApp que agenda sozinha pelo seu cliente. Soluciona a bagunça de papel e planilha, as faltas de cliente, o produto que acaba sem aviso e a falta de controle financeiro." },
  { q: "A IA do WhatsApp funciona automaticamente?", a: "Sim. Nossa IA interpreta as mensagens dos seus clientes, consulta a agenda em tempo real e confirma ou reagenda os horários — sem você precisar tocar no celular." },
];

const highlights = [
  { icon: "verified_user", label: "30 dias grátis",   sub: "Sem cartão de crédito"   },
  { icon: "smart_toy",     label: "IA no WhatsApp",   sub: "Agendamento automático"  },
  { icon: "headset_mic",   label: "Suporte incluso",  sub: "Em todos os planos"      },
  { icon: "bar_chart",     label: "Relatórios reais", sub: "Em tempo real"           },
];

const navLinks = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Preços",          href: "#precos"          },
  { label: "FAQ",             href: "#faq"             },
  { label: "Cadastro",        href: "#cadastro"        },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen">

      {/* Fixed aurora background */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-30 animate-aurora"
          style={{ background: "var(--color-primary-container)", top: "-200px", left: "-200px" }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 animate-aurora"
          style={{ background: "var(--color-secondary-container)", bottom: "-200px", right: "-200px", animationDelay: "-7.5s" }}
        />
      </div>

      {/* ── HEADER ─────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all-custom"
        style={{
          paddingTop:     "12px",
          paddingBottom:  "12px",
          background:     scrolled ? "rgba(14,12,2,0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
          boxShadow:      scrolled ? "0 1px 0 rgba(255,255,255,0.06)" : "none",
          opacity:        scrolled ? 1 : 0,
          pointerEvents:  scrolled ? "auto" : "none",
        }}
      >
        <div className="w-full px-4 md:px-8 lg:px-16 flex items-center justify-between">
          <a href="#home" className="flex items-center">
            <Image src="/logo.png" alt="Nexa" width={480} height={519} className="h-9 w-auto block" priority />
          </a>
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-on-surface-variant hover:text-on-surface transition-all-custom"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <GoldBorderButton href="/login" className="hidden md:inline-flex px-5 py-2 text-sm">
            Entrar
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_forward</span>
          </GoldBorderButton>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 -mr-2 text-on-surface-variant hover:text-on-surface transition-all-custom"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Abrir menu"
          >
            <motion.span
              className="material-symbols-outlined block"
              animate={{ rotate: menuOpen ? 90 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              style={{ fontSize: "26px" }}
            >
              {menuOpen ? "close" : "menu"}
            </motion.span>
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden px-4 pb-5 pt-2 flex flex-col gap-1 border-t"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              {navLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="py-3 text-sm font-medium text-on-surface-variant hover:text-primary border-b transition-all-custom"
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}
                >
                  {link.label}
                </a>
              ))}
              <GoldBorderButton href="/login" className="w-full mt-3">
                Entrar
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_forward</span>
              </GoldBorderButton>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── HERO ───────────────────────────────────── */}
      <section id="home" className="relative">
        <LampContainer className="rounded-none min-h-[100dvh]" logoSrc="/logo.png">
          <div className="hero-enter mb-5" style={{ animationDelay: "0.3s" }}>
            <h1
              className="font-black text-on-surface neon-text animate-floating select-none text-center"
              style={{
                fontSize: "clamp(5.5rem, 18vw, 11rem)",
                lineHeight: 1,
                letterSpacing: "-0.03em",
                fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif",
              }}
            >
              NEXA
              <span className="sr-only"> — Gestão inteligente para salões de beleza com IA no WhatsApp. Mais lucro, menos problemas.</span>
            </h1>
          </div>
          <p
            className="hero-enter text-xl md:text-3xl font-semibold text-on-surface max-w-lg mx-auto mb-10 text-center tracking-tight"
            style={{ animationDelay: "0.5s" }}
          >
            Mais lucro, menos problemas<span className="text-primary">.</span>
          </p>
          <div
            className="hero-enter flex flex-wrap items-center justify-center gap-4"
            style={{ animationDelay: "0.65s" }}
          >
            <GoldBorderButton href="/cadastro" className="px-8 py-3.5">
              Começar grátis
            </GoldBorderButton>
            <GoldBorderButton href="#funcionalidades" className="px-8 py-3.5">
              Ver funcionalidades
            </GoldBorderButton>
          </div>
        </LampContainer>

        {/* Indicador de scroll — desktop only, anima pra baixo e
            faz scroll suave pra próxima seção quando clicado */}
        <motion.a
          href="#sobre"
          aria-label="Ver próxima seção"
          className="hidden md:flex absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex-col items-center gap-2 group"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <span
            className="text-xs font-medium tracking-widest text-on-surface-variant uppercase group-hover:text-primary transition-all-custom"
            style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
          >
            Role para descobrir
          </span>
          <motion.span
            className="material-symbols-outlined text-primary"
            style={{ fontSize: "32px" }}
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            keyboard_arrow_down
          </motion.span>
        </motion.a>
      </section>

      {/* ── SOBRE ──────────────────────────────────── */}
      <section id="sobre" className="py-12 md:py-20 px-margin-mobile md:px-margin-desktop">
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="text-center mb-6 md:mb-10"
          >
            <p
              className="text-xs font-medium tracking-widest text-primary uppercase mb-3"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
            >
              Plataforma
            </p>
            <h2
              className="text-3xl md:text-5xl font-bold text-on-surface"
              style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
            >
              Sobre a Nexa
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: "computer",  title: "Dashboard Web",  desc: "Gestão completa: agenda, financeiro, equipe e estoque — de qualquer dispositivo." },
              { icon: "smart_toy", title: "WhatsApp com IA", desc: "A IA entende, agenda e confirma automaticamente — sem você precisar responder." },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 md:p-8 flex gap-4 items-start"
              >
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(200,153,51,0.12)" }}
                >
                  <span className="material-symbols-outlined text-primary text-2xl">{card.icon}</span>
                </div>
                <div>
                  <h3 className="font-bold text-on-surface mb-1">{card.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{card.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUÇÕES ───────────────────────────────── */}
      <section id="solucoes" className="py-12 md:py-20 px-margin-mobile md:px-margin-desktop">
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="text-center mb-6 md:mb-10"
          >
            <p
              className="text-xs font-medium tracking-widest text-primary uppercase mb-3"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
            >
              Para Quem é a Nexa?
            </p>
            <h2
              className="text-3xl md:text-5xl font-bold text-on-surface"
              style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
            >
              Soluções
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {personas.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 md:p-8 relative overflow-hidden"
              >
                {p.popular && (
                  <span
                    className="absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: "rgba(200,153,51,0.15)",
                      color: "var(--color-primary)",
                      border: "1px solid rgba(200,153,51,0.3)",
                    }}
                  >
                    Mais Popular
                  </span>
                )}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(200,153,51,0.12)" }}
                >
                  <span className="material-symbols-outlined text-primary text-2xl">{p.icon}</span>
                </div>
                <span
                  className="text-xs font-medium tracking-widest text-primary uppercase block mb-1"
                  style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
                >
                  {p.tag}
                </span>
                <h3 className="font-bold text-on-surface text-lg mb-2">{p.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{p.desc}</p>
                <span
                  className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
                  style={{
                    background: "rgba(160,120,255,0.1)",
                    color: "var(--color-primary-fixed-dim)",
                    border: "1px solid rgba(200,153,51,0.2)",
                  }}
                >
                  {p.plan}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NOSSO OBJETIVO ─────────────────────────── */}
      <section className="py-12 md:py-20 px-margin-mobile md:px-margin-desktop">
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="text-center mb-6 md:mb-10"
          >
            <p
              className="text-xs font-medium tracking-widest text-primary uppercase mb-3"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
            >
              Por que a Nexa?
            </p>
            <h2
              className="text-3xl md:text-5xl font-bold text-on-surface"
              style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
            >
              Nosso Objetivo
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {objectives.map((obj, i) => (
              <motion.div
                key={obj.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 md:p-8"
              >
                <span className="material-symbols-outlined text-primary text-4xl md:text-5xl mb-4 block">{obj.icon}</span>
                <h3 className="font-bold text-on-surface mb-2 md:text-lg">{obj.title}</h3>
                <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">{obj.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ────────────────────────── */}
      <section id="funcionalidades" className="py-12 md:py-20 px-margin-mobile md:px-margin-desktop">
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="text-center mb-6 md:mb-10"
          >
            <p
              className="text-xs font-medium tracking-widest text-primary uppercase mb-3"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
            >
              Recursos
            </p>
            <h2
              className="text-3xl md:text-5xl font-bold text-on-surface mb-4"
              style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
            >
              Funcionalidades
            </h2>
            <p className="text-base text-on-surface-variant max-w-xl mx-auto">
              Tudo que seu salão precisa, em uma plataforma simples e poderosa.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 100, damping: 20, delay: (i % 3) * 0.07 }}
                className="glass-card rounded-2xl p-4 sm:p-5 md:p-6 text-center"
              >
                <span className="material-symbols-outlined text-primary text-3xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 md:mb-4 block">{f.icon}</span>
                <h4 className="text-sm md:text-base font-semibold text-on-surface mb-1 md:mb-2">{f.title}</h4>
                <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMO COMEÇAR ───────────────────────────── */}
      <section className="py-12 md:py-20 px-margin-mobile md:px-margin-desktop">
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="text-center mb-6 md:mb-10"
          >
            <p
              className="text-xs font-medium tracking-widest text-primary uppercase mb-3"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
            >
              Comece Agora
            </p>
            <h2
              className="text-3xl md:text-5xl font-bold text-on-surface"
              style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
            >
              Como Começar
            </h2>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="flex-1 space-y-8">
              {steps.map((step, i) => (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.12 }}
                  className="flex gap-5"
                >
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{
                      background: "rgba(200,153,51,0.12)",
                      border: "1px solid rgba(200,153,51,0.3)",
                      color: "var(--color-primary)",
                      fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                    }}
                  >
                    {step.n}
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface mb-1">{step.title}</h4>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
              className="glass-card rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center text-center md:w-72 flex-shrink-0"
            >
              <motion.span
                className="material-symbols-outlined text-primary block mb-4"
                style={{ fontSize: "64px" }}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                bolt
              </motion.span>
              <p className="font-bold text-on-surface text-lg">Comece hoje</p>
              <p className="text-sm text-on-surface-variant mt-1 mb-6">30 dias grátis · Sem burocracia</p>
              <GoldBorderButton href="/cadastro" className="w-full">
                Cadastre-se agora
              </GoldBorderButton>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PREÇOS ─────────────────────────────────── */}
      <section id="precos" className="py-12 md:py-20 px-margin-mobile md:px-margin-desktop">
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="text-center mb-10"
          >
            <p
              className="text-xs font-medium tracking-widest text-primary uppercase mb-3"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
            >
              Planos
            </p>
            <h2
              className="text-3xl md:text-5xl font-bold text-on-surface mb-4"
              style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
            >
              Experimente primeiro, depois escolha.
            </h2>
            <p className="text-base text-on-surface-variant max-w-md mx-auto mb-8">
              Planos simples e transparentes. 30 dias grátis em todos os planos.
            </p>
          </motion.div>

          {/* Period selector + cards — CSS-only (radio inputs), works without JS */}
          <div className="period-group">
            <input type="radio" name="period" id="period-anual"     className="period-radio" defaultChecked />
            <input type="radio" name="period" id="period-semestral" className="period-radio" />
            <input type="radio" name="period" id="period-mensal"    className="period-radio" />

            {/* Period toggle */}
            <div className="period-toggle flex justify-center overflow-x-auto mb-10">
              <div
                className="flex rounded-full p-1 min-w-max"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {PERIODS.map(p => (
                  <label
                    key={p.key}
                    htmlFor={`period-${p.key}`}
                    className="period-pill h-8 sm:h-9 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap text-on-surface-variant transition-all-custom"
                  >
                    {p.label}
                    {p.badge && (
                      <span className="period-badge text-xs font-bold text-tertiary">{p.badge}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Plan cards */}
            <div className="period-cards grid md:grid-cols-3 gap-6">
            {nexaPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.1 }}
              >
                <GlowCard
                  glowColor="purple"
                  customSize={true}
                  style={{
                    "--backdrop": "rgba(29,26,5,0.55)",
                    "--backup-border": plan.popular
                      ? "rgba(200,153,51,0.4)"
                      : "rgba(200,153,51,0.1)",
                    "--border": "1.5",
                    "--spread": "0",
                    "--base": "40",
                  } as React.CSSProperties}
                  className="!p-0 !gap-0 !shadow-none w-full text-white"
                >
                  {/* inner content wrapper — fills the card */}
                  <div className="flex flex-col p-6 relative overflow-hidden">

                    {/* popular accent line */}
                    {plan.popular && (
                      <div
                        className="absolute top-0 left-0 right-0 h-0.5"
                        style={{ background: "var(--color-primary)" }}
                      />
                    )}

                    {/* tag badge */}
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full self-start mb-4 ${plan.popular ? "mt-2" : ""}`}
                      style={{
                        background: plan.popular ? "rgba(200,153,51,0.15)" : "rgba(255,255,255,0.06)",
                        color:      plan.popular ? "var(--color-primary)" : "var(--color-on-surface-variant)",
                        border:     plan.popular ? "1px solid rgba(200,153,51,0.3)" : "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {plan.tag}
                    </span>

                    <h3 className="text-2xl font-bold text-on-surface mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-sm text-on-surface-variant">R$</span>
                      <span className="price-val price-anual text-4xl font-bold text-on-surface">{plan.price.anual}</span>
                      <span className="price-val price-semestral text-4xl font-bold text-on-surface">{plan.price.semestral}</span>
                      <span className="price-val price-mensal text-4xl font-bold text-on-surface">{plan.price.mensal}</span>
                      <span className="text-sm text-on-surface-variant">/mês</span>
                    </div>
                    <p className="text-xs text-on-surface-variant mb-5 leading-relaxed">{plan.description}</p>

                    <GoldBorderButton href="/cadastro" className="w-full mb-5">
                      {plan.buttonText}
                    </GoldBorderButton>

                    <div className="border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <p className="text-xs font-semibold text-on-surface-variant mb-3">{plan.professionals}</p>
                      <ul className="space-y-2">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-center gap-2 text-sm text-on-surface-variant">
                            <span className="material-symbols-outlined text-primary flex-shrink-0" style={{ fontSize: "16px" }}>check_circle</span>
                            {f}
                          </li>
                        ))}
                        <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-primary flex-shrink-0" style={{ fontSize: "16px" }}>check_circle</span>
                          {plan.support}
                        </li>
                      </ul>
                    </div>

                  </div>
                </GlowCard>
              </motion.div>
            ))}
            </div>
          </div>

          <p className="text-center text-xs mt-8 text-outline">
            Todos os planos incluem 30 dias de teste grátis · Sem cartão de crédito
          </p>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────── */}
      <section id="faq" className="py-12 md:py-20 px-margin-mobile md:px-margin-desktop">
        <div className="w-full">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="text-center mb-6 md:mb-10"
            >
              <p
                className="text-xs font-medium tracking-widest text-primary uppercase mb-3"
                style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}
              >
                Dúvidas
              </p>
              <h2
                className="text-3xl md:text-5xl font-bold text-on-surface"
                style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
              >
                Perguntas Frequentes
              </h2>
            </motion.div>

            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <details
                  key={i}
                  name="faq"
                  className="faq-item glass-card rounded-2xl overflow-hidden"
                >
                  <summary className="w-full flex items-center justify-between px-6 py-4 text-left gap-4 cursor-pointer select-none">
                    <span className="faq-question text-sm font-semibold transition-all-custom text-on-surface">
                      {faq.q}
                    </span>
                    <span
                      className="faq-arrow material-symbols-outlined flex-shrink-0"
                      style={{ color: "var(--color-on-surface-variant)", fontSize: "20px" }}
                    >
                      keyboard_arrow_down
                    </span>
                  </summary>
                  <div className="faq-answer">
                    <p
                      className="px-6 pb-5 text-sm leading-relaxed border-t pt-4 text-on-surface-variant"
                      style={{ borderColor: "rgba(255,255,255,0.06)" }}
                    >
                      {faq.a}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────── */}
      <section className="py-12 md:py-20 px-margin-mobile md:px-margin-desktop">
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="glass-card rounded-3xl p-6 sm:p-10 md:p-16 relative overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(to right, transparent, var(--color-primary), transparent)" }}
            />

            <div className="relative z-10 text-center mb-10">
              <h2
                className="text-2xl sm:text-3xl md:text-5xl font-bold text-on-surface mb-4"
                style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
              >
                Transforme a gestão do seu salão hoje.
              </h2>
              <p className="text-base text-on-surface-variant max-w-md mx-auto mb-8">
                Sem burocracia, sem cartão de crédito. Comece em menos de 2 minutos.
              </p>
              <GoldBorderButton href="/cadastro" className="px-8 py-3.5">
                Criar conta grátis
              </GoldBorderButton>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {highlights.map((h, i) => (
                <motion.div
                  key={h.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.07 }}
                  className="text-center p-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="material-symbols-outlined text-primary text-3xl mb-2 block">{h.icon}</span>
                  <p className="text-sm font-semibold text-on-surface">{h.label}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{h.sub}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer
        className="py-10 md:py-16 px-margin-mobile md:px-margin-desktop"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 mb-8 md:mb-12">
            <div className="col-span-2 md:col-span-1">
              <h3
                className="font-bold text-xl mb-3 text-on-surface"
                style={{ fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}
              >
                Nexa
              </h3>
              <p className="text-sm leading-relaxed max-w-xs text-outline">
                Gestão inteligente para salões de beleza com IA integrada ao WhatsApp.
              </p>
            </div>
            {[
              {
                title: "Produto",
                links: [
                  { label: "Funcionalidades", href: "#funcionalidades" },
                  { label: "Preços",          href: "#precos"          },
                  { label: "FAQ",             href: "#faq"             },
                  { label: "Blog",            href: "#"               },
                ],
              },
              {
                title: "Empresa",
                links: [
                  { label: "Sobre",     href: "#sobre"   },
                  { label: "Parceiros", href: "#"        },
                  { label: "Cadastro",  href: "#cadastro" },
                  { label: "Contato",   href: "#"        },
                ],
              },
              {
                title: "Legal",
                links: [
                  { label: "Termos de Uso", href: "#" },
                  { label: "Privacidade",   href: "#" },
                  { label: "Licenças",      href: "#" },
                ],
              },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-xs uppercase tracking-wider mb-4 text-on-surface">
                  {col.title}
                </h4>
                <ul className="space-y-2.5 text-sm text-on-surface-variant">
                  {col.links.map(link => (
                    <li key={link.label}>
                      <a href={link.href} className="hover:text-on-surface transition-all-custom">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div
            className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-outline"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p>© 2026 Nexa. Todos os direitos reservados.</p>
            <p>Feito para o mercado de beleza brasileiro</p>
          </div>
        </div>
      </footer>

      {/* ── WHATSAPP FAB ───────────────────────────── */}
      <a
        href="https://wa.me/5511999999999"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center shadow-lg transition-all-custom z-50 animate-pulse-custom"
        aria-label="Fale conosco no WhatsApp"
      >
        <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

    </div>
  );
}
