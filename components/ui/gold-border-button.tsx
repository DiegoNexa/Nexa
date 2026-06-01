"use client";
import React from "react";
import { cn } from "@/lib/utils";

type GoldBorderButtonProps = {
  href?: string;
  className?: string;
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler;
  target?: string;
  rel?: string;
  style?: React.CSSProperties;
};

export function GoldBorderButton({
  href,
  className,
  children,
  type = "button",
  onClick,
  target,
  rel,
  style,
}: GoldBorderButtonProps) {
  const baseClass = cn(
    "gold-border-btn relative inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm text-white cursor-pointer select-none active:scale-[0.98] transition-transform duration-150",
    className
  );
  const mergedStyle: React.CSSProperties = { background: "#1D1A05", ...style };

  // Quando o link abre em outra aba, força noopener+noreferrer
  // para evitar tabnabbing (a nova aba poderia controlar a aba
  // pai via window.opener). Usamos Set para deduplicar tokens
  // caso o caller já tenha passado algum.
  const safeRel =
    target === "_blank"
      ? Array.from(
          new Set(`${rel ?? ""} noopener noreferrer`.split(/\s+/).filter(Boolean)),
        ).join(" ")
      : rel;

  if (href) {
    return (
      <a
        href={href}
        className={baseClass}
        style={mergedStyle}
        target={target}
        rel={safeRel}
        onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={baseClass}
      style={mergedStyle}
      onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
    >
      {children}
    </button>
  );
}
