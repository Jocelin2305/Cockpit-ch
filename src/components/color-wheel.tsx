"use client";

import { useRef } from "react";

// Roue chromatique : l'angle donne la teinte, la distance au centre la saturation ; le curseur règle la luminosité.
export function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt((hex || "#0e5a55").slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)];
}
export function hslToHex(h: number, s: number, l: number) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (k: number) => {
    const c = l / 100 - a * Math.max(-1, Math.min(((k + h / 30) % 12) - 3, 9 - ((k + h / 30) % 12), 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function ColorWheel({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const wheel = useRef<HTMLDivElement>(null);
  const [h, s, l] = hexToHsl(value);
  const pick = (e: React.PointerEvent) => {
    if (e.type === "pointermove" && e.buttons !== 1) return;
    const r = wheel.current!.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
    const hue = (Math.atan2(x, -y) * 180) / Math.PI;
    const sat = Math.min(100, (Math.hypot(x, y) / (r.width / 2)) * 100);
    onChange(hslToHex((hue + 360) % 360, Math.round(sat), l || 40));
  };
  const rad = (s / 100) * 50;
  return (
    <div className="color-pick">
      <span className="label-text">{label}</span>
      <div className="row">
        <div ref={wheel} className="wheel" onPointerDown={pick} onPointerMove={pick} role="slider" aria-label={`${label} : teinte et saturation`} aria-valuetext={value}>
          <i style={{ left: `${50 + rad * Math.sin((h * Math.PI) / 180)}%`, top: `${50 - rad * Math.cos((h * Math.PI) / 180)}%`, background: value }} />
        </div>
        <div className="stack">
          <span className="swatch" style={{ background: value }} />
          <label className="field">
            <span className="hint">Luminosité</span>
            <input type="range" min={10} max={95} value={l} onChange={(e) => onChange(hslToHex(h, s, Number(e.target.value)))} />
          </label>
          <input className="input mono sm" value={value} maxLength={7} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && onChange(e.target.value)} aria-label={`${label} (code)`} />
        </div>
      </div>
    </div>
  );
}
