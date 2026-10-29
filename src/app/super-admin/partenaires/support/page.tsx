import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { answerFeature, answerTicket } from "../actions";

export const metadata: Metadata = { title: "Support distributeurs" };

const fmt = (d: Date) => d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

// File de support (prioritaire d'abord, puis par échéance) et demandes de fonctionnalités de l'offre C.
export default async function SupportPage() {
  const { user } = await requireSuperAdmin();
  if (!user.isFounder) redirect("/super-admin");
  const [tickets, features] = await Promise.all([
    db.supportTicket.findMany({ where: { status: { not: "clos" } }, include: { reseller: { select: { companyName: true, email: true } } }, orderBy: [{ priority: "asc" }, { dueAt: "asc" }], take: 100 }),
    db.featureRequest.findMany({ include: { reseller: { select: { companyName: true, email: true } } }, orderBy: { dueAt: "asc" }, take: 50 }),
  ]);
  const now = new Date();
  return (
    <div className="view wide">
      <header className="view-head">
        <div>
          <span className="label">Partenaires</span>
          <h1>Support distributeurs</h1>
          <p className="muted">Prioritaire : réponse visée sous 4 h. Standard : 48 h. Demandes de fonctionnalité : réponse sous 10 jours ouvrés.</p>
        </div>
      </header>
      <section className="panel">
        <h2>Demandes de support</h2>
        {tickets.length === 0 && <p className="muted">Aucune demande en cours.</p>}
        <div className="stack">
          {tickets.map((t) => (
            <article key={t.id} className="message">
              <div className="row between">
                <b>{t.subject}</b>
                <span className="small">{t.priority === "prioritaire" ? <span className="chip ok">prioritaire</span> : <span className="chip">standard</span>} <span className={t.dueAt < now ? "chip late" : "muted"}>avant le {fmt(t.dueAt)}</span></span>
              </div>
              <p className="muted small">{t.reseller.companyName || t.reseller.email} · {fmt(t.createdAt)} · {t.status}</p>
              <p className="pre">{t.body}</p>
              <form action={answerTicket} className="stack">
                <input type="hidden" name="id" value={t.id} />
                <textarea className="input" name="answer" rows={2} defaultValue={t.answer} placeholder="Votre réponse (visible par le distributeur)" />
                <div className="row">
                  <button className="btn sm primary" type="submit" name="status" value="répondu">Répondre</button>
                  <button className="btn sm" type="submit" name="status" value="clos">Clore</button>
                </div>
              </form>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Demandes de fonctionnalité (offre C)</h2>
        {features.length === 0 && <p className="muted">Aucune demande.</p>}
        <div className="stack">
          {features.map((f) => (
            <article key={f.id} className="message">
              <div className="row between"><b>{f.title}</b><span className="small"><span className="chip">{f.status}</span> <span className={f.dueAt < now && f.status === "reçue" ? "chip late" : "muted"}>réponse avant le {fmt(f.dueAt)}</span></span></div>
              <p className="muted small">{f.reseller.companyName || f.reseller.email} · {fmt(f.createdAt)}</p>
              <p className="pre">{f.body}</p>
              <form action={answerFeature} className="stack">
                <input type="hidden" name="id" value={f.id} />
                <textarea className="input" name="answer" rows={2} defaultValue={f.answer} placeholder="Décision, délai ou chiffrage" />
                <div className="row">
                  {["acceptée", "refusée", "chiffrée"].map((s) => <button key={s} className="btn sm" type="submit" name="status" value={s}>{s[0].toUpperCase() + s.slice(1)}</button>)}
                </div>
              </form>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
