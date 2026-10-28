"use client";

import { useState, useTransition } from "react";
import { MAX_LI_RELANCES, MAX_RELANCES, seqSteps, stepDay } from "@/lib/prospecting";
import { saveTemplate } from "../actions";
import { draftTemplate } from "../../ai-actions";

export function TemplateEditor({
  id, name: initialName, delays: initialDelays, liDelays: initialLiDelays, steps: initialSteps, readOnly,
}: { id: string; name: string; delays: number[]; liDelays: number[]; steps: Record<string, string>; readOnly: boolean }) {
  const [name, setName] = useState(initialName);
  const [delays, setDelays] = useState(initialDelays);
  const [liDelays, setLiDelays] = useState(initialLiDelays);
  const [steps, setSteps] = useState(initialSteps);
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [pending, start] = useTransition();
  const setStep = (k: string, v: string) => setSteps((s) => ({ ...s, [k]: v }));
  // Ajoute une relance quelques jours après la précédente, ou retire la dernière.
  const grow = (a: number[], gap: number) => [...a, (a[a.length - 1] ?? 0) + gap];
  const list = seqSteps(delays, liDelays);

  return (
    <div className="stack">
      <section className="panel">
        <label className="field">
          <span className="label-text">Nom de la séquence</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />
        </label>
        <div className="field">
          <span className="label-text">Relances email, en jours après l&apos;email J0</span>
          <div className="inline wrap">
            <span className="hint">{delays.length} relance{delays.length > 1 ? "s" : ""} email</span>
            <button type="button" className="btn sm" disabled={readOnly || delays.length >= MAX_RELANCES} onClick={() => setDelays((a) => grow(a, 5))}>+ Ajouter</button>
            <button type="button" className="btn sm" disabled={readOnly || delays.length === 0} onClick={() => setDelays((a) => a.slice(0, -1))}>– Retirer la dernière</button>
          </div>
          <div className="delays">
            {delays.map((d, i) => (
              <label key={i} className="field">
                <span className="hint">Relance {i + 1}</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={180}
                  value={d}
                  disabled={readOnly}
                  onChange={(e) => setDelays((a) => a.map((x, j) => (j === i ? Number(e.target.value) : x)))}
                />
              </label>
            ))}
          </div>
          <span className="label-text">Relances LinkedIn, en jours après l&apos;invitation</span>
          <div className="inline wrap">
            <span className="hint">{liDelays.length} relance{liDelays.length > 1 ? "s" : ""} LinkedIn</span>
            <button type="button" className="btn sm" disabled={readOnly || liDelays.length >= MAX_LI_RELANCES} onClick={() => setLiDelays((a) => grow(a, 7))}>+ Ajouter</button>
            <button type="button" className="btn sm" disabled={readOnly || liDelays.length === 0} onClick={() => setLiDelays((a) => a.slice(0, -1))}>– Retirer la dernière</button>
          </div>
          <div className="delays">
            {liDelays.map((d, i) => (
              <label key={i} className="field">
                <span className="hint">LinkedIn {i + 1}</span>
                <input className="input" type="number" min={1} max={180} value={d} disabled={readOnly} onChange={(e) => setLiDelays((a) => a.map((x, j) => (j === i ? Number(e.target.value) : x)))} />
              </label>
            ))}
          </div>
        </div>
        <p className="note">
          Variables remplacées pour chaque prospect : <span className="mono">{"{prenom} {nom} {fonction} {entreprise} {ville} {secteur} {phrase} {angle} {argumentaire} {signature}"}</span>.
          {" "}{"{argumentaire}"} reprend l&apos;argumentaire complet du prospect, {"{phrase}"} sa phrase de qualification, {"{signature}"} celle de vos Paramètres. Une variable vide devient [À compléter].
        </p>
      </section>

      <div className="tracks">
        {(["Email", "LinkedIn"] as const).map((ch) => (
          <section key={ch} className="panel">
            <h2>{ch === "Email" ? "Emails" : "LinkedIn"}</h2>
            <p className="hint">{ch === "Email" ? "Préparés à partir de ces textes, puis relances programmées automatiquement." : "En parallèle, à copier-coller : LinkedIn interdit l'envoi automatisé."}</p>
            <div className="timeline">
              {list.filter((s) => s.ch === ch).map((s) => (
                <div key={s.k} className="step">
                  <span className={`day ${s.day === "J0" ? "d0" : ""}`}>{stepDay(s, delays, liDelays)}</span>
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
                const res = await draftTemplate(id, delays, liDelays);
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
            onClick={() => start(async () => setMsg(await saveTemplate(id, { name, delays, liDelays, steps })))}
          >
            {pending ? "Enregistrement…" : "Enregistrer la séquence"}
          </button>
        </div>
      )}
    </div>
  );
}
