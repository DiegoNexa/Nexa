import type { NextConfig } from "next";

// Deriva o host do Supabase do env var. Build falha se faltar,
// o que é proposital — o CSP precisa do host real. Sem fallback:
// um default silencioso aponta o CSP pro projeto errado em produção.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL não definida. O CSP precisa do host real do " +
      "Supabase. Defina em .env.local (dev) e nas env vars da Vercel (prod).",
  );
}

const SUPABASE_HOST = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host;

// Content Security Policy — limita o que o navegador pode carregar/executar.
// Em dev, Next precisa de 'unsafe-eval' (HMR usa eval). 'unsafe-inline' em
// script-src é necessário para o JSON-LD do schema.org no <head> do layout.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: https://${SUPABASE_HOST}`,
  "font-src 'self' https://fonts.gstatic.com data:",
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy",     value: csp },
  { key: "Strict-Transport-Security",   value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options",             value: "DENY" },
  { key: "X-Content-Type-Options",      value: "nosniff" },
  { key: "Referrer-Policy",             value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",          value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control",      value: "on" },
];

const nextConfig: NextConfig = {
  // Sem remotePatterns: todas as imagens são locais (/logo.png).
  // Se um dia precisar carregar imagem externa, adicione aqui:
  //   images: { remotePatterns: [{ protocol: "https", hostname: "..." }] }
  async headers() {
    return [
      {
        // Aplica para todas as rotas
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
