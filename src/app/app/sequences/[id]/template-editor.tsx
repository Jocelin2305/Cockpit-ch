"use client";

import { useState, useTransition } from "react";
import { SEQ_STEPS, stepDay } from "@/lib/prospecting";
import { saveTemplate } from "../actions";
import { draftTemplate } from "../../ai-actions";

export function TemplateEditor({
  id, name: initialName, delays: initialDelays, steps: initialSteps, readOnly,
}: { id: string; name: string; delays: number[]; steps: Record<string, string>; readOnly: boolean }) {
  const [name, setName] = useState(initialName);
  const [delays, setDelays] = useState(initialDelays);
  const [steps, setSteps] = useState(initialSteps);
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [pending, start] = useTransition();
  const setStep = (k: string, v: string) => setSteps((s) => ({ ...s, [k]: v }));

  return (
    <div className="stack">
      <section className="panel">
        <label className="field">
          <span className="label-text">Nom de la séquence</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />
        </label>
        <div className="field">
          <span className="label-text">Relances email, en jours après l&apos;email J0</span>
          <div className="delays">
            {delays.map((d, i) => (
              <label key={i} className="field">
                <span className="hint">Relance {i + 1}</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={120}
                  value={d}
                  disabled={readOnly}
                  onChange={(e) => setDelays((a) => a.map((x, j) => (j === i ? Number(e.target.value) : x)))}
                />
              </label>
            ))}
          </div>
        </div>
        <p className="note">
          Variables remplacées pour chaque prospect : <span className="mono">{"{prenom} {nom} {fonction} {entreprise} {ville} {secteur} {phrase} {signature}"}</span>.
          {" "}{"{phrase}"} reprend la phrase de qualification de la fiche, {"{signature}"} celle de votre profil. Une variable vide devient [À compléter].
        </p>
      </section>

      <div className="tracks">
        {(["Email", "LinkedIn"] as const).map((ch) => (
          <section key={ch} className="panel">
            <h2>{ch === "Email" ? "Emails" : "LinkedIn"}</h2>
            <p className="hint">{ch === "Email" ? "Préparés à partir de ces textes, puis relances programmées automatiquement." : "En parallèle, à copier-coller : LinkedIn interdit l'envoi automatisé."}</p>
            <div className="timeline">
              {SEQ_STEPS.filter((s) => s.ch === ch).map((s) => (
                <div key={s.k} className="step">
                  <span className={`day ${s.day === "J0" ? "d0" : ""}`}>{stepDay(s, delays)}</span>
                  <div className="stepcard">
                    <b>{s.t}</b>
                    {s.subj && <input className="input" placeholder="Objet" value={steps[s.subj] ?? ""} onChange={(e) => setStep(s.subj!, e.target.value)} disabled={readOnly} aria-label={`Objet ${s.t}`} />}
                    <textarea className="input" rows={6} value={steps[s.k] ?? ""} onChange={(e) => setStep(s.k, e.target.value)} disabled={readOnly} aria-label={s.t} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {msg.error && <p className="alert error">{msg.error}</p>}
      {msg.ok && <p className="alert ok">{msg.ok}</p>}
      {!readOnly && (
        <div className="row">
          <button
            type="button"
            className="btn"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setMsg({});
                const res = await draftTemplate(id, delays);
                if (res.steps) {
                  setSteps(res.steps);
                  setMsg({ ok: "Séquence rédigée par l'IA : relisez-la, puis enregistrez." });
                } else setMsg({ error: res.error });
              })
            }
          >
            {pending ? "Rédaction (≈ 30 s)…" : "✦ Rédiger avec l'IA"}
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={pending}
            onClick={() => start(async () => setMsg(await saveTemplate(id, { name, delays, steps })))}
          >
            {pending ? "Enregistrement…" : "Enregistrer la séquence"}
          </button>
        </div>
      )}
    </div>
  );
}
