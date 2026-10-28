"use client";

import { useState, useTransition } from "react";
import { setPriority } from "@/app/app/prospects/actions";
import { PRIO } from "@/lib/prospecting";
import { PhoneLink, type CallTarget } from "./call-dock";

// Priorité modifiable à la main ; la clé resynchronise le menu après une mise à jour serveur.
export function PrioritySelect({ id, priority }: { id: string; priority: string }) {
  return <PrioritySelectInner key={priority} id={id} priority={priority} />;
}
function PrioritySelectInner({ id, priority }: { id: string; priority: string }) {
  const [pending, start] = useTransition();
  return (
    <select className={`input sm prio-select ${priority}`} aria-label="Priorité" defaultValue={priority} disabled={pending} onChange={(e) => { const v = e.target.value; start(() => setPriority(id, v)); }}>
      {(["A", "B", "C"] as const).map((k) => <option key={k} value={k}>{PRIO[k]}</option>)}
    </select>
  );
}

type Coord = { k: "T" | "E" | "L"; label: string; value: string };

// Lettres T / E / L : vertes si l'info existe ; un clic affiche la coordonnée.
export function CoordChips({ p, email, linkedin }: { p: CallTarget; email: string; linkedin: string }) {
  const [open, setOpen] = useState<Coord["k"] | null>(null);
  const coords: Coord[] = [
    { k: "T", label: "Numéro direct", value: p.phone },
    { k: "E", label: "Email", value: email },
    { k: "L", label: "LinkedIn", value: linkedin },
  ];
  const cur = coords.find((c) => c.k === open);
  return (
    <div className="coords-wrap">
      <div className="coords">
        {coords.map((c) => (
          <button key={c.k} type="button" className={c.value ? "on" : ""} title={c.label} aria-expanded={open === c.k} onClick={() => setOpen(open === c.k ? null : c.k)}>{c.k}</button>
        ))}
      </div>
      {cur && (
        <div className="coord-pop" role="dialog" aria-label={cur.label}>
          <span className="label">{cur.label}</span>
          {!cur.value ? <span className="enrich">À enrichir</span>
            : cur.k === "T" ? <PhoneLink p={p} />
            : cur.k === "E" ? <a href={`mailto:${cur.value}`}>{cur.value}</a>
            : <a href={cur.value} target="_blank" rel="noreferrer">Ouvrir le profil</a>}
          {cur.value && cur.k !== "L" && <button type="button" className="btn sm ghost" onClick={() => navigator.clipboard?.writeText(cur.value).catch(() => undefined)}>Copier</button>}
        </div>
      )}
    </div>
  );
}

// Angle : le résumé dans le tableau, l'argumentaire complet (repris dans les séquences) au clic.
export function AngleCell({ angle, detail }: { angle: string; detail: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="angle-cell">
      <span className="ang">{angle}</span>
      {detail && (
        <>
          <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Masquer l'argumentaire" : "Voir l'argumentaire"}</button>
          {open && <p className="ang-detail">{detail}</p>}
        </>
      )}
    </div>
  );
}
