"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { addDays, fmtDay, STATUSES, todayISO } from "@/lib/prospecting";
import type { CallReport } from "@/lib/ai-features";
import { analyzeCall, findProspects, quickOutcome, saveCallReport, type QuickKind } from "@/app/app/call-actions";

export type CallTarget = { id: string; company: string; contactName: string; phone: string; status: string; angle: string; qualification: string };

const EVENT = "cockpitch:call";
const pad = (n: number) => String(n).padStart(2, "0");
const clock = (ms: number) => { const s = Math.floor(ms / 1000); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

// Numéro cliquable : lance l'appel (téléphone ou softphone) et ouvre le panneau de prise de notes.
export function PhoneLink({ p, className }: { p: CallTarget; className?: string }) {
  return (
    <a
      className={className ?? "tel"}
      href={telHref(p.phone)}
      data-tip="Cliquez pour appeler : le panneau d'appel s'ouvre pour noter ce qui se dit, la fiche se met à jour à la fin."
      onClick={() => window.dispatchEvent(new CustomEvent<CallTarget>(EVENT, { detail: p }))}
    >
      {p.phone}
    </a>
  );
}

export function CallDock({ aiReady }: { aiReady: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<CallTarget | null>(null);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<CallTarget[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [now, setNow] = useState(0);
  const [notes, setNotes] = useState("");
  const [proposal, setProposal] = useState<{ report: CallReport; framework: string } | null>(null);
  const [mStatus, setMStatus] = useState("");
  const [mCallback, setMCallback] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [pending, start] = useTransition();

  const reset = (target: CallTarget | null) => {
    setP(target); setNotes(""); setProposal(null); setDuration(0); setMsg({}); setMCallback("");
    setMStatus(target?.status ?? ""); setStartedAt(target ? Date.now() : null); setNow(Date.now());
  };

  useEffect(() => {
    const onCall = (e: Event) => { reset((e as CustomEvent<CallTarget>).detail); setOpen(true); };
    window.addEventListener(EVENT, onCall);
    return () => window.removeEventListener(EVENT, onCall);
  }, []);

  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  useEffect(() => {
    if (!open || p) return;
    const t = setTimeout(() => findProspects(q).then(setFound).catch(() => setFound([])), 200);
    return () => clearTimeout(t);
  }, [q, open, p]);

  const elapsed = startedAt ? Math.max(0, now - startedAt) : duration;
  const stopClock = () => {
    if (!startedAt) return duration;
    const d = Date.now() - startedAt;
    setDuration(d); setStartedAt(null);
    return d;
  };
  const done = (text: string) => { setMsg({ ok: text }); reset(null); router.refresh(); };

  const quick = (kind: QuickKind) => p && start(async () => {
    const res = await quickOutcome(p.id, kind, stopClock());
    if (res.error) setMsg(res); else done(res.ok ?? "Appel enregistré.");
  });
  const analyze = () => p && start(async () => {
    setMsg({});
    const res = await analyzeCall(p.id, notes);
    if ("report" in res && res.report) setProposal({ report: res.report, framework: res.framework });
    else setMsg({ error: res.error });
  });
  const save = (input: Parameters<typeof saveCallReport>[1]) => p && start(async () => {
    const res = await saveCallReport(p.id, input);
    if (res.error) setMsg(res); else done(res.ok ?? "Compte rendu enregistré.");
  });

  const r = proposal?.report;
  return (
    <>
      <button type="button" className="fab" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-tip="Saisir un appel à la main : choisissez le prospect, prenez vos notes, la fiche se met à jour.">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
        </svg>
        <span className="sr-only">Appel</span>
      </button>

      {open && (
        <section className="dock" aria-label="Appel en cours">
          <div className="panel-head">
            <h2>{p ? p.company : "Saisir un appel"}</h2>
            <button type="button" className="btn sm ghost" onClick={() => setOpen(false)}>Fermer</button>
          </div>

          {!p && (
            <div className="stack">
              <input className="input" type="search" placeholder="Entreprise, interlocuteur ou numéro…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
              <div className="list">
                {found.map((f) => (
                  <button key={f.id} type="button" className="li pick" onClick={() => reset(f)}>
                    <span><b>{f.company}</b><span className="muted small block">{[f.contactName, f.phone, f.status].filter(Boolean).join(" · ")}</span></span>
                  </button>
                ))}
                {found.length === 0 && <p className="muted small">Aucun prospect trouvé.</p>}
              </div>
            </div>
          )}

          {p && (
            <div className="stack">
              <p className="muted small">{[p.contactName, p.phone, p.status].filter(Boolean).join(" · ")} · <Link href={`/app/prospects/${p.id}`}>fiche</Link></p>
              {p.angle && <p className="note">{p.angle}</p>}
              <div className="row between">
                <div className="inline">
                  <button type="button" className={startedAt ? "btn sm danger armed" : "btn sm"} onClick={() => (startedAt ? stopClock() : (setNow(Date.now()), setStartedAt(Date.now())))}>
                    {startedAt ? "Fin d'appel" : "Chrono"}
                  </button>
                  <span className="timer mono">{clock(elapsed)}</span>
                </div>
                {p.phone && <a className="btn sm" href={telHref(p.phone)}>Rappeler</a>}
              </div>
              <div className="inline wrap">
                <button type="button" className="btn sm" disabled={pending} onClick={() => quick("noanswer")}>Pas de réponse</button>
                <button type="button" className="btn sm" disabled={pending} onClick={() => quick("voicemail")}>Messagerie</button>
                <button type="button" className="btn sm" disabled={pending} onClick={() => quick("wrong")}>Mauvais n°</button>
                <button type="button" className="btn sm" disabled={pending} onClick={() => quick("nointerest")}>Pas intéressé</button>
              </div>
              <textarea className="input" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes pendant l'appel : besoin, budget, décideur, objections, prochaine étape…" />

              {!r && (
                <>
                  <div className="row">
                    <label className="field"><span className="label-text">Statut</span>
                      <select className="input" value={mStatus} onChange={(e) => setMStatus(e.target.value)}>
                        {STATUSES.filter((s) => s !== "Relancé").map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </label>
                    <label className="field"><span className="label-text">Rappeler le</span>
                      <input className="input" type="date" min={addDays(todayISO(), 0)} value={mCallback} onChange={(e) => setMCallback(e.target.value)} />
                    </label>
                  </div>
                  <div className="inline wrap">
                    {aiReady && <button type="button" className="btn primary" disabled={pending || notes.trim().length < 20} onClick={analyze}>{pending ? "Analyse…" : "✦ Analyser et mettre à jour"}</button>}
                    <button type="button" className={aiReady ? "btn" : "btn primary"} disabled={pending || !notes.trim()} onClick={() => save({ notes, durationMs: stopClock(), resume: notes.slice(0, 600), statut: mStatus, rappelLe: mCallback || null })}>Enregistrer</button>
                  </div>
                </>
              )}

              {r && proposal && (
                <div className="callres">
                  <b>Compte rendu proposé</b>
                  <p>{r.resume}</p>
                  <ul>
                    <li>Intérêt : {r.interet}</li>
                    {r.statut !== p.status && <li>Statut → {r.statut}</li>}
                    {r.rappelLe && <li>Rappel le {fmtDay(r.rappelLe)}</li>}
                    {r.prochaineEtape && <li>Prochaine étape : {r.prochaineEtape}</li>}
                  </ul>
                  <div className="inline">
                    <button type="button" className="btn primary" disabled={pending} onClick={() => save({ ...r, notes, durationMs: stopClock(), next: r.prochaineEtape, framework: proposal.framework })}>Valider</button>
                    <button type="button" className="btn ghost" onClick={() => setProposal(null)}>Rejeter</button>
                  </div>
                </div>
              )}
              <button type="button" className="btn sm ghost" onClick={() => reset(null)}>← Autre prospect</button>
            </div>
          )}
          {msg.error && <p className="alert error">{msg.error}</p>}
          {msg.ok && <p className="alert ok">{msg.ok}</p>}
        </section>
      )}
    </>
  );
}
