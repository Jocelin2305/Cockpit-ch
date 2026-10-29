import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { dossierComplete, euros, offerById, OFFERS, resellerStats, VIDEO_CATEGORIES } from "@/lib/resellers";
import { deleteVideo, updateReseller } from "./actions";
import { MessageForm, ResellerForm, VideoForm } from "./forms";

export const metadata: Metadata = { title: "Partenaires revendeurs" };

const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default async function PartnersPage() {
  const { user } = await requireSuperAdmin();
  if (!user.isFounder) redirect("/super-admin");
  const [resellers, messages, videos] = await Promise.all([
    db.reseller.findMany({ orderBy: { createdAt: "desc" }, include: { organizations: { where: { isDemo: false } } } }),
    db.resellerMessage.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.resellerVideo.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const rows = resellers.map((r) => ({ r, s: resellerStats(r.organizations, r.offer) }));
  const total = rows.reduce((t, { r, s }) => ({ active: t.active + (r.active ? 1 : 0), clients: t.clients + s.active, ca: t.ca + s.ca, commission: t.commission + s.commission }), { active: 0, clients: 0, ca: 0, commission: 0 });
  // Abonnements des revendeurs eux-mêmes (20 € / mois chacun).
  const partnerFees = rows.filter(({ r }) => r.active).reduce((t, { r }) => t + offerById(r.offer).monthly, 0);

  return (
    <div className="view wide">
      <header className="view-head">
        <div>
          <span className="label">Fondateur</span>
          <h1>Partenaires revendeurs</h1>
          <p className="muted">Vos revendeurs, les clients qu&apos;ils apportent et les commissions à leur verser. Chaque revendeur a son propre espace super admin, limité à ses clients.</p>
        </div>
      </header>

      <div className="kpis">
        <div className="kpi"><span className="v">{total.active}</span><span className="k">revendeurs actifs</span></div>
        <div className="kpi"><span className="v">{total.clients}</span><span className="k">comptes clients actifs apportés</span></div>
        <div className="kpi win"><span className="v">{euros(total.ca)}</span><span className="k">CA mensuel généré (HT)</span></div>
        <div className="kpi"><span className="v">{euros(total.commission)}</span><span className="k">commissions du mois</span></div>
      </div>
      <p className="muted small">Abonnements partenaires : {euros(partnerFees)} / mois. Commission = taux de la formule × abonnements des clients payants du revendeur.</p>

      <section className="panel">
        <h2>Ajouter un revendeur</h2>
        <p className="muted small">Il reçoit son propre espace Cockpit&apos;ch (accès offert), son espace super admin pour onboarder ses clients, et l&apos;Espace affilié où il complète son dossier (RIB, SIRET, adresse, gérant).</p>
        <ResellerForm />
        <div className="offers">
          {OFFERS.map((o) => (
            <div key={o.id} className="offer-card">
              <b>{o.name}</b>
              <span className="muted small">{o.entry ? `${euros(o.entry)} à l'entrée` : "0 € à l'entrée"} · {euros(o.monthly)} / mois{o.commitment ? ` · ${o.commitment}` : ""}</span>
              <span className="big">{Math.round(o.rate * 100)} %</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel flush">
        <div className="panel-head pad"><h2>Revendeurs</h2><span className="label">{resellers.length}</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Revendeur</th><th>Formule</th><th>Dossier</th><th>Clients actifs</th><th>En essai</th><th>CA mensuel</th><th>Commission</th><th>Depuis</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={9} className="muted">Aucun revendeur pour l&apos;instant.</td></tr>}
              {rows.map(({ r, s }) => (
                <tr key={r.id} className={r.active ? undefined : "muted"}>
                  <td><Link href={`/super-admin/partenaires/${r.id}`}><b>{r.companyName || r.email}</b></Link><br /><span className="muted small">{r.managerName || r.email}</span></td>
                  <td>
                    <form action={updateReseller} className="inline">
                      <input type="hidden" name="id" value={r.id} />
                      <select className="input sm" name="offer" defaultValue={r.offer} aria-label="Formule">
                        {OFFERS.map((o) => <option key={o.id} value={o.id}>{o.name} · {Math.round(o.rate * 100)} %</option>)}
                      </select>
                      <button className="btn sm" type="submit">OK</button>
                    </form>
                  </td>
                  <td>{dossierComplete(r) ? <span className="chip ok">complet</span> : <span className="chip late">à compléter</span>}</td>
                  <td className="num">{s.active}</td>
                  <td className="num">{s.trials}</td>
                  <td className="num">{euros(s.ca)}</td>
                  <td className="num"><b>{euros(s.commission)}</b></td>
                  <td className="muted">{fmt(r.createdAt)}</td>
                  <td>
                    <div className="inline">
                      <Link className="btn sm" href={`/super-admin/partenaires/${r.id}`}>Détail</Link>
                      <form action={updateReseller}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="active" value={r.active ? "0" : "1"} />
                        <button className="btn sm ghost" type="submit">{r.active ? "Suspendre" : "Réactiver"}</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid2">
        <section className="panel">
          <h2>Communication aux revendeurs</h2>
          <p className="muted small">Votre message s&apos;affiche dans l&apos;Espace affilié de tous les revendeurs actifs, et part par email si la case est cochée.</p>
          <MessageForm />
          {messages.length > 0 && (
            <ul className="list">
              {messages.map((m) => <li key={m.id}><b>{m.subject}</b> <span className="muted small">· {fmt(m.createdAt)}{m.emailed ? ` · ${m.emailed} email${m.emailed > 1 ? "s" : ""}` : ""}</span></li>)}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Vidéos du centre d&apos;aide affilié</h2>
          <p className="muted small">Liens YouTube (non répertoriés de préférence) classés en démonstration, vente et onboarding.</p>
          <VideoForm />
          {VIDEO_CATEGORIES.map((c) => {
            const list = videos.filter((v) => v.category === c.id);
            return list.length ? (
              <div key={c.id}>
                <span className="label">{c.label}</span>
                <ul className="list">
                  {list.map((v) => (
                    <li key={v.id} className="row between">
                      <a href={v.url} target="_blank" rel="noreferrer">{v.title}</a>
                      <form action={deleteVideo}><input type="hidden" name="id" value={v.id} /><button className="btn sm ghost" type="submit">Retirer</button></form>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null;
          })}
        </section>
      </div>
    </div>
  );
}
