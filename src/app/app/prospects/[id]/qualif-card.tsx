"use client";

import { useState, useTransition } from "react";
import { FRAMEWORKS, qualScore, type Qualif } from "@/lib/prospecting";
import { saveQualif } from "../actions";

const HELP: Record<string, string> = {
  BANT: "Rapide, ventes simples.",
  MEDDIC: "Ventes complexes, plusieurs décideurs.",
  SPICED: "Ventes orientées valeur.",
  CHAMP: "Centré sur le problème du prospect.",
};
const LEVELS = ["Inconnu", "Partiel", "Validé"];

export function QualifCard({ id, initial }: { id: string; initial: Qualif | null }) {
  const [q, setQ] = useState<Qualif>(initial ?? { fw: "BANT", v: {} });
  const [pending, start] = useTransition();
  const update = (next: Qualif) => {
    setQ(next);
    start(() => saveQualif(id, next));
  };
  const score = qualScore(q) ?? 0;
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Qualification</h2>
        <span className="muted small">{pending ? "Enregistrement…" : "Enregistrée automatiquement"}</span>
      </div>
      <div className="seg" role="group" aria-label="Méthode">
        {Object.keys(FRAMEWORKS).map((fw) => (
          <button key={fw} type="button" aria-pressed={q.fw === fw} onClick={() => update({ fw, v: q.fw === fw ? q.v : {} })}>{fw}</button>
        ))}
      </div>
      <p className="hint">{HELP[q.fw]}</p>
      {FRAMEWORKS[q.fw].map((item) => (
        <div key={item} className="qrow">
          <span>{item}</span>
          <div className="seg" role="group" aria-label={item}>
            {LEVELS.map((l, n) => (
              <button key={l} type="button" aria-pressed={(q.v[item] ?? 0) === n} onClick={() => update({ ...q, v: { ...q.v, [item]: n } })}>{l}</button>
            ))}
          </div>
        </div>
      ))}
      <div className="scorebar"><div className="g"><i style={{ width: `${score}%` }} /></div><span className="num">{score} %</span></div>
    </section>
  );
}
