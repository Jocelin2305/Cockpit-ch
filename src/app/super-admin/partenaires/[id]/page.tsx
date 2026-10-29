import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { appUrl, requireSuperAdmin } from "@/lib/auth";
import { decrypt } from "@/lib/mail";
import { dossierComplete, euros, offerById, resellerStats } from "@/lib/resellers";

export const metadata: Metadata = { title: "Revendeur" };

const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

// IBAN complet, lisible par le fondateur seul pour verser les commissions.
function readIban(enc: string) {
  if (!enc) return "";
  try { return decrypt(enc).replace(/(.{4})/g, "$1 ").trim(); } catch { return "illisible (clé de chiffrement changée)"; }
}

export default async function ResellerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireSuperAdmin();
  if (!user.isFounder) redirect("/super-admin");
  const { id } = await params;
  const r = await db.reseller.findUnique({ where: { id }, include: { organizations: { where: { isDemo: false }, orderBy: { createdAt: "desc" } } } });
  if (!r) notFound();
  const s = resellerStats(r.organizations, r.offer);
  const offer = offerById(r.offer);
  const dossier: [string, string][] = [
    ["Entreprise", r.companyName],
    ["SIRET", r.siret],
    ["Adresse", r.address],
    ["Gérant", r.managerName],
    ["Email du gérant", r.managerEmail],
    ["Téléphone du gérant", r.managerPhone],
    ["IBAN", readIban(r.ibanEnc)],
    ["BIC", r.bic],
  ];

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <Link href="/super-admin/partenaires" className="small">← Partenaires revendeurs</Link>
          <h1>{r.companyName || r.email}</h1>
          <p className="muted">Formule <span className="chip">{offer.name} · {Math.round(offer.rate * 100)} %</span> · depuis le {fmt(r.createdAt)} · {r.active ? "actif" : "suspendu"}</p>
        </div>
      </header>

      <div className="kpis">
        <div className="kpi"><span className="v">{s.active}</span><span className="k">clients actifs</span></div>
        <div className="kpi"><span className="v">{s.trials}</span><span className="k">en essai</span></div>
        <div className="kpi"><span className="v">{euros(s.ca)}</span><span className="k">CA mensuel généré (HT)</span></div>
        <div className="kpi win"><span className="v">{euros(s.commission)}</span><span className="k">commission du mois</span></div>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Dossier</h2>{dossierComplete(r) ? <span className="chip ok">complet</span> : <span className="chip late">à compléter par le revendeur</span>}</div>
        <dl className="dl">
          {dossier.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={k === "IBAN" ? "mono" : undefined}>{v || <span className="muted">non renseigné</span>}</dd></div>)}
        </dl>
        <p className="muted small">Lien d&apos;inscription parrainé : <span className="mono">{appUrl()}/inscription?partenaire={r.code}</span></p>
      </section>

      <section className="panel flush">
        <div className="panel-head pad"><h2>Clients apportés</h2><span className="label">{r.organizations.length}</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Entreprise</th><th>Abonnement</th><th>CA mensuel</th><th>Commission</th><th>Créée le</th></tr></thead>
            <tbody>
              {s.rows.length === 0 && <tr><td colSpan={5} className="muted">Aucun client pour l&apos;instant.</td></tr>}
              {s.rows.map(({ org, state, ca, commission }) => (
                <tr key={org.id}>
                  <td><Link href={`/super-admin/entreprises/${org.id}`}><b>{org.name}</b></Link></td>
                  <td><span className={`chip ${state.kind === "active" ? "ok" : state.kind === "blocked" ? "late" : ""}`}>{state.kind === "trial" ? `Essai · ${state.daysLeft} j` : state.kind === "blocked" ? "Inactif" : state.planName}</span></td>
                  <td className="num">{euros(ca)}</td>
                  <td className="num"><b>{euros(commission)}</b></td>
                  <td className="muted">{fmt(org.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
