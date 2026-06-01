"use client";

type View = "dia" | "semana" | "mes";

const VIEWS: { key: View; label: string; icon: string }[] = [
  { key: "dia",    label: "Dia",    icon: "today"          },
  { key: "semana", label: "Semana", icon: "view_week"      },
  { key: "mes",    label: "Mês",    icon: "calendar_month" },
];

type Props = {
  current?: View;
};

/**
 * Toggle de 3 estados (Dia / Semana / Mês) usando radio inputs +
 * CSS — funciona sem JS. Mesmo padrão do seletor de período no
 * pricing da landing.
 */
export function ViewSwitcher({ current = "semana" }: Props) {
  return (
    <div className="agenda-view-group">
      <input type="radio" name="agenda-view" id="view-dia"    className="agenda-view-radio" defaultChecked={current === "dia"} />
      <input type="radio" name="agenda-view" id="view-semana" className="agenda-view-radio" defaultChecked={current === "semana"} />
      <input type="radio" name="agenda-view" id="view-mes"    className="agenda-view-radio" defaultChecked={current === "mes"} />

      <div
        className="agenda-view-toggle inline-flex rounded-full p-1"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {VIEWS.map(v => (
          <label
            key={v.key}
            htmlFor={`view-${v.key}`}
            className="agenda-view-pill h-9 px-4 rounded-full text-sm font-medium flex items-center gap-2 cursor-pointer whitespace-nowrap text-on-surface-variant transition-all-custom"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              {v.icon}
            </span>
            {v.label}
          </label>
        ))}
      </div>
    </div>
  );
}
