"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface HoverButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const HoverButton = React.forwardRef<HTMLButtonElement, HoverButtonProps>(
  ({ className, children, style, ...props }, ref) => {
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const [isListening, setIsListening] = React.useState(false);
    const [circles, setCircles] = React.useState<
      Array<{
        id: number;
        x: number;
        y: number;
        color: string;
        fadeState: "in" | "out" | null;
      }>
    >([]);
    const lastAddedRef = React.useRef(0);

    // Expose the inner button to the forwarded ref
    React.useImperativeHandle(ref, () => buttonRef.current!, []);

    const createCircle = React.useCallback((x: number, y: number) => {
      const buttonWidth = buttonRef.current?.offsetWidth || 0;
      const xPos = x / buttonWidth;
      const color = `linear-gradient(to right, var(--circle-start) ${xPos * 100}%, var(--circle-end) ${
        xPos * 100
      }%)`;

      setCircles((prev) => [
        ...prev,
        { id: Date.now() + Math.random(), x, y, color, fadeState: null },
      ]);
    }, []);

    const handlePointerMove = React.useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!isListening) return;
        const currentTime = Date.now();
        if (currentTime - lastAddedRef.current > 100) {
          lastAddedRef.current = currentTime;
          const rect = event.currentTarget.getBoundingClientRect();
          createCircle(event.clientX - rect.left, event.clientY - rect.top);
        }
      },
      [isListening, createCircle],
    );

    const handlePointerEnter = React.useCallback(() => setIsListening(true), []);
    const handlePointerLeave = React.useCallback(() => setIsListening(false), []);

    React.useEffect(() => {
      circles.forEach((circle) => {
        if (!circle.fadeState) {
          setTimeout(() => {
            setCircles((prev) =>
              prev.map((c) => (c.id === circle.id ? { ...c, fadeState: "in" } : c)),
            );
          }, 0);
          setTimeout(() => {
            setCircles((prev) =>
              prev.map((c) => (c.id === circle.id ? { ...c, fadeState: "out" } : c)),
            );
          }, 1000);
          setTimeout(() => {
            setCircles((prev) => prev.filter((c) => c.id !== circle.id));
          }, 2200);
        }
      });
    }, [circles]);

    return (
      <button
        ref={buttonRef}
        className={cn(
          // base
          "relative isolate px-8 py-4 rounded-2xl",
          "font-bold text-base leading-6 tracking-tight",
          "text-[#1D1A05]",
          "cursor-pointer overflow-hidden",
          "transition-transform duration-150",
          // gold gradient body
          "bg-gradient-to-br from-[#E8D080] via-[#C89933] to-[#8B6B1F]",
          // bright glow
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_20px_rgba(200,153,51,0.45),0_8px_32px_rgba(200,153,51,0.25)]",
          "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_28px_rgba(200,153,51,0.6),0_12px_40px_rgba(232,208,128,0.4)]",
          "hover:brightness-[1.05]",
          "active:scale-[0.98]",
          "disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:brightness-100",
          className,
        )}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={
          {
            "--circle-start": "#FFF8E0",
            "--circle-end":   "#FFE8A0",
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        {circles.map(({ id, x, y, color, fadeState }) => (
          <div
            key={id}
            className={cn(
              "absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
              "blur-lg pointer-events-none z-[1] transition-opacity duration-300",
              fadeState === "in" && "opacity-90",
              fadeState === "out" && "opacity-0 duration-[1.2s]",
              !fadeState && "opacity-0",
            )}
            style={{ left: x, top: y, background: color }}
          />
        ))}
        <span className="relative z-[2]">{children}</span>
      </button>
    );
  },
);

HoverButton.displayName = "HoverButton";

export { HoverButton };
