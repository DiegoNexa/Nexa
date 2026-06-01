import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["500"],
});

const SITE_URL = "https://nexa.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Nexa — Gestão inteligente para salões de beleza",
    template: "%s · Nexa",
  },
  description:
    "Automatize agendamentos pelo WhatsApp com IA, controle agenda, estoque, equipe e finanças do seu salão. 30 dias grátis, sem cartão de crédito.",
  keywords: [
    "nexa",
    "salão",
    "gestão de salão",
    "agendamento online",
    "whatsapp com ia",
    "saas beleza",
  ],
  authors: [{ name: "Nexa" }],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Nexa",
    title: "Nexa — Gestão inteligente para salões de beleza",
    description:
      "Automatize agendamentos pelo WhatsApp com IA, controle agenda, estoque, equipe e finanças. 30 dias grátis.",
    images: [{ url: "/logo.png", width: 1200, height: 1200, alt: "Nexa" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexa — Gestão inteligente para salões de beleza",
    description:
      "Automatize agendamentos pelo WhatsApp com IA. Agenda, estoque, equipe e finanças em uma plataforma.",
    images: ["/logo.png"],
  },
  robots: { index: true, follow: true },
};

const schemaOrg = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Nexa",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "SaaS de gestão para salões de beleza com IA integrada ao WhatsApp.",
  url: SITE_URL,
  offers: [
    { "@type": "Offer", name: "Solo",         price: "49",  priceCurrency: "BRL" },
    { "@type": "Offer", name: "Profissional", price: "99",  priceCurrency: "BRL" },
    { "@type": "Offer", name: "Premium",      price: "199", priceCurrency: "BRL" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
        />
      </head>
      <body className="bg-background text-on-surface antialiased">
        {children}
      </body>
    </html>
  );
}
