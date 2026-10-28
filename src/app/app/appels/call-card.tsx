"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { addDays, fmtDay, PRIO, STATUSES, todayISO } from "@/lib/prospecting";
import type { CallReport } from "@/lib/ai-features";
import { analyzeCall, quickOutcome, saveCallReport, type QuickKind } from "./actions";

type P = {
  id: string; company: string; contactName: string; contactRole: string; city: string; phone: string; angle: string;
  qualification: string; status: string; priority: string; searchName: string | null;
};
type C = { id: string; day: string; issue: string; resume: string; interet: string; next: string; durationMs: number };

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (ms: number) => { const s = Math.floor(ms / 1000); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };

export function CallCard({ prospect: p, calls, nextHref, aiReady }: { prospect: P; calls: C[]; nextHref: string | null; aiReady: boolean }) {
  const router = useRouter();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [now, setNow] = useState(0);
  const [notes, setNotes] = useState("");
  const [proposal, setProposal] = useState<{ report: CallReport; framework: string } | null>(null);
  const [manual, setManual] = useState(false);
  const [mStatus, setMStatus] = useState(p.status);
  const [mCallback, setMCallback] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const elapsed = startedAt ? Math.max(0, now - startedAt) : duration;
  const stopClock = () => {
    if (!startedAt) return duration;
    const d = Date.now() - startedAt;
    setDuration(d);
    setStartedAt(null);
    return d;
  };
  const goNext = () => { if (nextHref) router.push(nextHref); else router.refresh(); };

  const quick = (kind: QuickKind) =>
    start(async () => {
      const res = await quickOutcome(p.id, kind, stopClock());
      if (res.error) setMsg(res);
      else goNext();
    });

  const analyze = () =>
    start(async () => {
      setMsg({});
      const res = await analyzeCall(p.id, notes);
      if ("report" in res && res.report) setProposal({ report: res.report, framework: res.framework });
      else setMsg({ error: res.error });
    });

  const save = (next: boolean, input: Parameters<typeof saveCallReport>[1]) =>
    start(async () => {
      const res = await saveCallReport(p.id, input);
      if (res.error) { setMsg(res); return; }
      setMsg(res);
      setNotes(""); setProposal(null); setManual(false); setDuration(0);
      if (next) goNext(); else router.refresh();
    });

  const r = proposal?.report;
  return (
    <section className="panel callcard">
      <div className="panel-head">
        <div>
          <span className="label">{p.searchName ?? "Sans recherche"}</span>
          <h2 className="big">{p.company}</h2>
          <p className="muted">{[p.contactName || "Interlocuteur à enrichir", p.contactRole, p.city].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="row tight">
          <span className="chip">{p.status}</span>
          <span className={`prio ${p.priority}`}>{PRIO[p.priority]}</span>
          <Link className="btn sm ghost" href={`/app/prospects/${p.id}`}>Fiche</Link>
        </div>
      </div>

      <div className="phone">
        <span className="num mono">{p.phone}</span>
        <button type="button" className="btn sm" onClick={() => navigator.clipboard?.writeText(p.phone).catch(() => undefined)}>Copier</button>
        <a className="btn sm" href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>Appeler</a>
      </div>

      <div className="angle-box">
        <span className="label">Angle commercial</span>
        <p>{p.angle || "Pas encore d'angle : rédigez-le depuis la fiche avant d'appeler."}</p>
        {p.qualification && <p className="muted small">Pourquoi maintenant : {p.qualification}</p>}
      </div>

      <div className="row between">
        <div className="row">
          <button
            type="button"
            className={startedAt ? "btn danger armed" : "btn primary"}
            onClick={() => (startedAt ? stopClock() : (setNow(Date.now()), setStartedAt(Date.now())))}
          >
            {startedAt ? "Terminer l'appel" : "Démarrer l'appel"}
          </button>
          <span className="timer mono">{clock(elapsed)}</span>
        </div>
        <div className="row tight">
          <button type="button" className="btn sm" disabled={pending} onClick={() => quick("noanswer")}>Pas de réponse</button>
          <button type="button" className="btn sm" disabled={pending} onClick={() => quick("voicemail")}>Messagerie</button>
          <button type="button" className="btn sm" disabled={pending} onClick={() => quick("wrong")}>Mauvais numéro</button>
          <button type="button" className="btn sm" disabled={pending} onClick={() => quick("nointerest")}>Pas intéressé</button>
        </div>
      </div>

      <label className="field">
        <span className="label-text">Compte rendu : collez la transcription de l&apos;appel (export de votre téléphonie) ou tapez vos notes</span>
        <textarea className="input" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Besoin, budget, décideur, objections, prochaine étape…" />
      </label>

      {!proposal && !manual && (
        <div className="row">
          <button type="button" className="btn primary" disabled={pending || !aiReady || notes.trim().length < 20} onClick={analyze}>
            {pending ? "Analyse de l'appel…" : "✦ Analyser et mettre à jour le suivi"}
          </button>
          <button type="button" className="btn" disabled={pending || !notes.trim()} onClick={() => setManual(true)}>Enregistrer sans IA</button>
          {nextHref && <Link className="btn ghost" href={nextHref}>Prospect suivant →</Link>}
          {!aiReady && <span className="hint">L&apos;analyse IA s&apos;activera avec votre clé API.</span>}
        </div>
      )}

      {manual && (
        <div className="callres">
          <b>Enregistrer le compte rendu</b>
          <div className="row">
            <label className="field">
              <span className="label-text">Statut après l&apos;appel</span>
              <select className="input" value={mStatus} onChange={(e) => setMStatus(e.target.value)}>
                {STATUSES.filter((s) => s !== "Relancé").map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="label-text">Rappeler le (facultatif)</span>
              <input className="input" type="date" min={addDays(todayISO(), 0)} value={mCallback} onChange={(e) => setMCallback(e.target.value)} />
            </label>
          </div>
          <div className="row">
            <button type="button" className="btn primary" disabled={pending} onClick={() => save(true, { notes, durationMs: duration, resume: notes.slice(0, 600), statut: mStatus, rappelLe: mCallback || null })}>Enregistrer et prospect suivant</button>
            <button type="button" className="btn ghost" onClick={() => setManual(false)}>Annuler</button>
          </div>
        </div>
      )}

      {r && proposal && (
        <div className="callres">
          <b>Compte rendu proposé</b>
          <p>{r.resume}</p>
          {r.objections.length > 0 && <p className="muted small">Objections : {r.objections.join(" · ")}</p>}
          {r.prochaineEtape && <p>Prochaine étape : <b>{r.prochaineEtape}</b></p>}
          <ul>
            <li>Intérêt : {r.interet}</li>
            {r.statut !== p.status && <li>Statut → {r.statut}</li>}
            {r.rappelLe && <li>Rappel le {fmtDay(r.rappelLe)}</li>}
            {r.qualification.some((q) => q.niveau > 0) && <li>Qualification {proposal.framework} mise à jour</li>}
            {r.infos.contactName && !p.contactName && <li>Interlocuteur : {r.infos.contactName}</li>}
            {r.infos.email && <li>Email : {r.infos.email}</li>}
          </ul>
          <div className="row">
            <button type="button" className="btn primary" disabled={pending} onClick={() => save(true, { ...r, notes, durationMs: duration, next: r.prochaineEtape, framework: proposal.framework })}>Valider et prospect suivant</button>
            <button type="button" className="btn" disabled={pending} onClick={() => save(false, { ...r, notes, durationMs: duration, next: r.prochaineEtape, framework: proposal.framework })}>Valider</button>
            <button type="button" className="btn ghost" onClick={() => setProposal(null)}>Rejeter</button>
          </div>
        </div>
      )}

      {msg.error && <p className="alert error">{msg.error}</p>}
      {msg.ok && <p className="alert ok">{msg.ok}</p>}

      {calls.length > 0 && (
        <div>
          <span className="label">Historique des appels</span>
          <div className="list">
            {calls.map((c) => (
              <div key={c.id} className="li">
                <div>
                  <b>{fmtDay(c.day)}{c.durationMs ? ` · ${Math.max(1, Math.round(c.durationMs / 60000))} min` : ""} · {c.issue}{c.interet ? ` · intérêt ${c.interet}` : ""}</b>
                  {c.resume && <span className="muted small block">{c.resume}</span>}
                  {c.next && <span className="small block">Prochaine étape : {c.next}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
