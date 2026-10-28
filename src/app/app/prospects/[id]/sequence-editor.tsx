"use client";

import { useState, useTransition } from "react";
import type { SeqStep } from "@/lib/prospecting";
import { saveSequence } from "../actions";
import { CopyBlock } from "./copy-block";

export function SequenceEditor({ id, steps, texts, days }: { id: string; steps: SeqStep[]; texts: Record<string, string>; days: Record<string, string> }) {
  const [t, setT] = useState(texts);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: string, v: string) => { setT((x) => ({ ...x, [k]: v })); setDirty(true); setSaved(false); };

  return (
    <div className="stack">
      <p className="hint">Les textes viennent du modèle de la recherche, variables remplies. Modifiez-les pour personnaliser ce prospect uniquement.</p>
      <div className="tracks">
        {(["Email", "LinkedIn"] as const).map((ch) => (
          <div key={ch} className="track">
            <h3>{ch === "Email" ? "Emails" : "LinkedIn"}</h3>
            <p className="hint">{ch === "Email" ? `J0 puis ${steps.filter((s) => /^relance/.test(s.k)).length} relance(s), programmées automatiquement.` : "En parallèle, à copier-coller : LinkedIn interdit l'envoi automatisé."}</p>
            {steps.filter((s) => s.ch === ch).map((s) => (
              <details key={s.k} className="step-card">
                <summary><span className="day">{days[s.k]}</span> {s.t}</summary>
                {s.subj && (
                  <label className="field">
                    <span className="label-text">Objet</span>
                    <input className="input" value={t[s.subj] ?? ""} onChange={(e) => set(s.subj!, e.target.value)} />
                  </label>
                )}
                <label className="field">
                  <span className="label-text">Message</span>
                  <textarea className="input" rows={7} value={t[s.k] ?? ""} onChange={(e) => set(s.k, e.target.value)} />
                </label>
                {ch === "LinkedIn" && <CopyBlock label="À copier dans LinkedIn" text={t[s.k] ?? ""} />}
              </details>
            ))}
          </div>
        ))}
      </div>
      <div className="row">
        <button
          type="button"
          className="btn primary"
          disabled={!dirty || pending}
          onClick={() => start(async () => { await saveSequence(id, t); setDirty(false); setSaved(true); })}
        >
          {pending ? "Enregistrement…" : "Enregistrer la séquence personnalisée"}
        </button>
        {saved && <span className="muted small">Enregistrée.</span>}
      </div>
    </div>
  );
}
