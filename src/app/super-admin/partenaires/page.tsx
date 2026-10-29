import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { dossierComplete, euros, OFFERS, offerById, offerPrice, resellerMonthlyFee, resellerStats, whiteLabelEligible } from "@/lib/resellers";
import { activateOffer, setWhiteLabel, updateReseller } from "./actions";
import { ResellerForm } from "./forms";

export const metadata: Metadata = { title: "Mes partenaires revendeurs" };

const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default async function PartnersPage() {
  const { user } = await requireSuperAdmin();
  if (!user.isFounder) redirect("/super-admin");
  const [resellers, openTickets] = await Promise.all([
    db.reseller.findMany({ orderBy: { createdAt: "desc" }, include: { organizations: true } }),
    db.supportTicket.count({ where: { status: "ouvert" } }),
  ]);
  const rows = resellers.map((r) => ({ r, s: resellerStats(r.organizations, r.offer) }));
  const live = rows.filter(({ r }) => r.active && r.offerStatus === "actif");
  const fees = live.reduce((t, { r }) => t + resellerMonthlyFee(r), 0);
  const commissions = live.reduce((t, { s }) => t + s.commission, 0);

  return (
    <div className="view wide">
      <header className="view-head">
        <div>
          <span className="label">Fondateur</span>
          <h1>Mes partenaires revendeurs</h1>
          <p className="muted">Vos distributeurs, leur offre, les abonnements qu&apos;ils facturent et la commission qui vous revient.</p>
        </div>
        <Link className="btn" href="/super-admin/partenaires/support">Support distributeurs{openTickets ? ` (${openTickets})` : ""}</Link>
      </header>

      <div className="kpis">
        <div className="kpi"><span className="v">{live.length}</span><span className="k">distributeurs actifs</span></div>
        <div className="kpi win"><span className="v">{euros(Math.round(fees))}</span><span className="k">abonnements distributeurs / mois (HT)</span></div>
        <div className="kpi"><span className="v">{rows.reduce((t, { s }) => t + s.active, 0)}</span><span className="k">clients actifs des distributeurs</span></div>
        <div className="kpi win"><span className="v">{euros(Math.round(commissions * 100) / 100)}</span><span className="k">commissions dues / mois (HT)</span></div>
      </div>

      <section className="panel">
        <h2>Ajouter un distributeur</h2>
        <p className="muted small">Il reçoit son espace Cockpit&apos;ch (accès offert), son espace super admin pour ses clients et son Espace affilié où il valide son offre.</p>
        <ResellerForm />
        <div className="offers">
          {OFFERS.map((o) => (
            <div key={o.id} className="offer-card">
              <b>{o.name}</b>
              <span className="muted small">{euros(offerPrice(o, "mensuel"))} / mois ou {euros(offerPrice(o, "annuel"))} / an · engagement 1 an</span>
              <span className="big">{Math.round(o.rate * 100)} %</span>
              <span className="muted small">de commission sur les abonnements qu&apos;il facture</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel flush">
        <div className="panel-head pad"><h2>Distributeurs</h2><span className="label">{resellers.length}</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Distributeur</th><th>Offre</th><th>Statut</th><th>Marque blanche</th><th>Dossier</th><th>Clients actifs</th><th>Abonnements facturés</th><th>Commission</th><th>Depuis</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={10} className="muted">Aucun distributeur pour l&apos;instant.</td></tr>}
              {rows.map(({ r, s }) => (
                <tr key={r.id} className={r.active ? undefined : "muted"}>
                  <td><Link href={`/super-admin/partenaires/${r.id}`}><b>{r.companyName || r.email}</b></Link><br /><span className="muted small">{r.managerName || r.email}</span></td>
                  <td>
                    <form action={updateReseller} className="inline">
                      <input type="hidden" name="id" value={r.id} />
                      <select className="input sm" name="offer" defaultValue={r.offer} aria-label="Offre">
                        {OFFERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                      <button className="btn sm" type="submit">OK</button>
                    </form>
                    <span className="muted small">{r.billing}{r.upsellPriority && r.offer !== "C" ? " · support prioritaire" : ""}{r.upsellWhiteLabel && r.offer !== "C" ? ` · marque blanche ${r.whiteLabelInstallments === 3 ? "en 3 fois" : ""}` : ""}</span>
                  </td>
                  <td>
                    <form action={activateOffer}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="on" value={r.offerStatus === "actif" ? "0" : "1"} />
                      {r.offerStatus === "actif" ? <span className="chip ok">active</span> : <button className="btn sm primary" type="submit">Paiement reçu : activer</button>}
                    </form>
                  </td>
                  <td>
                    <form action={setWhiteLabel}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="on" value={r.whiteLabel ? "0" : "1"} />
                      <button className={`btn sm${!r.whiteLabel && whiteLabelEligible(r) ? " primary" : ""}`} type="submit">{r.whiteLabel ? "Retirer" : "Débloquer"}</button>
                    </form>
                  </td>
                  <td>{dossierComplete(r) ? <span className="chip ok">complet</span> : <span className="chip late">à compléter</span>}</td>
                  <td className="num">{s.active}</td>
                  <td className="num">{euros(Math.round(s.ca))}</td>
                  <td className="num"><b>{euros(Math.round(s.commission * 100) / 100)}</b><br /><span className="muted small">{Math.round(offerById(r.offer).rate * 100)} %</span></td>
                  <td className="muted">{fmt(r.createdAt)}</td>
                  <td>
                    <form action={updateReseller}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="active" value={r.active ? "0" : "1"} />
                      <button className="btn sm ghost" type="submit">{r.active ? "Suspendre" : "Réactiver"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="muted small">Les commissions reposent sur les prix déclarés par chaque distributeur pour ses clients (droit d&apos;audit). Pour les rendre vérifiables automatiquement, la facturation de leurs clients devra passer par la plateforme (Stripe Connect).</p>
    </div>
  );
}
