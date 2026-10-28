"use client";

import { useEffect, useState } from "react";

type Tip = { text: string; x: number; y: number; below: boolean };

// Guide d'adoption : chaque élément qui porte data-tip affiche une infobulle au survol ou au focus.
export function Guide({ enabled }: { enabled: boolean }) {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("guide-on", enabled);
    if (!enabled) return;
    const show = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.("[data-tip]");
      if (!el) return setTip(null);
      const r = el.getBoundingClientRect();
      const below = r.top < 120;
      setTip({ text: el.getAttribute("data-tip") ?? "", x: Math.min(Math.max(r.left + r.width / 2, 150), window.innerWidth - 150), y: below ? r.bottom + 8 : r.top - 8, below });
    };
    const hide = () => setTip(null);
    document.addEventListener("mouseover", show);
    document.addEventListener("focusin", show);
    window.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("mouseover", show);
      document.removeEventListener("focusin", show);
      window.removeEventListener("scroll", hide, true);
      root.classList.remove("guide-on");
    };
  }, [enabled]);

  if (!enabled || !tip?.text) return null;
  return (
    <div role="tooltip" className={`guide-tip${tip.below ? " below" : ""}`} style={{ left: tip.x, top: tip.y }}>
      {tip.text}
    </div>
  );
}
