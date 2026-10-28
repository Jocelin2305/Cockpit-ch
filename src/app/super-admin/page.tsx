import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { isSuperAdminEmail, requireSuperAdmin, ROLES } from "@/lib/auth";
import { accessState } from "@/lib/billing";
import { planById } from "@/lib/plans";
import { enterOrganization, setSuperAdmin } from "./actions";
import { ClientForm } from "./client-form";

export const metadata: Metadata = { title: "Super admin" };

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "jamais");

async function loadOverview() {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  return Promise.all([
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { memberships: true } },
        memberships: { where: { role: ROLES.ADMIN }, include: { user: true }, orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: weekAgo } } }),
    db.user.count({ where: { lastLoginAt: { gte: weekAgo } } }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { memberships: { include: { organization: true } } } }),
    db.aiUsage.groupBy({
      by: ["organizationId"],
      where: { createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
      _sum: { inputTokens: true, outputTokens: true },
    }),
  ]);
}

// Estimation au tarif public de Claude Opus 5.5 (4 $ / 20 $ par million de jetons), hors réductions du cache.
const estimate = (input: number, output: number) => (input * 4 + output * 20) / 1_000_000;
const fmtTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : n >= 1000 ? `${Math.round(n / 1000)} k` : String(n));

export default async function SuperAdminPage() {
  const { user: me } = await requireSuperAdmin();
  const [organizations, userCount, newUsers, activeUsers, recentUsers, aiByOrg] = await loadOverview();
  const ai = new Map(aiByOrg.map((r) => [r.organizationId, { i: r._sum.inputTokens ?? 0, o: r._sum.outputTokens ?? 0 }]));
  const aiTotal = [...ai.values()].reduce((s, v) => s + estimate(v.i, v.o), 0);
  const states = new Map(organizations.map((o) => [o.id, accessState(o)]));
  const paying = organizations.filter((o) => ["active", "past_due"].includes(states.get(o.id)!.kind));
  const mrr = paying.reduce((s, o) => s + (planById(o.plan)?.price ?? 0), 0);
  const trials = organizations.filter((o) => states.get(o.id)!.kind === "trial").length;
  const statusLabel = (id: string) => {
    const st = states.get(id)!;
    return st.kind === "trial" ? `Essai · ${st.daysLeft} j` : st.kind === "active" ? `${st.planName}${st.cancelAtPeriodEnd ? " (résilié)" : ""}` : st.kind === "past_due" ? `${st.planName} · impayé` : st.reason === "trial_over" ? "Essai terminé" : st.reason === "unpaid" ? "Suspendu" : "Résilié";
  };

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="label">Fondateur</span>
          <h1>Vue d&apos;ensemble</h1>
          <p className="muted">Toutes les entreprises clientes et leurs utilisateurs.</p>
        </div>
      </header>

      <div className="kpis">
        <div className="kpi"><span className="v">{organizations.length}</span><span className="k">entreprises</span></div>
        <div className="kpi"><span className="v">{userCount}</span><span className="k">utilisateurs</span></div>
        <div className="kpi"><span className="v">{newUsers}</span><span className="k">nouveaux (7 jours)</span></div>
        <div className="kpi"><span className="v">{activeUsers}</span><span className="k">actifs (7 jours)</span></div>
      </div>
      <div className="kpis">
        <div className="kpi win"><span className="v">{mrr} €</span><span className="k">revenu mensuel récurrent (HT)</span></div>
        <div className="kpi"><span className="v">{paying.length}</span><span className="k">entreprises payantes</span></div>
        <div className="kpi"><span className="v">{trials}</span><span className="k">en essai gratuit</span></div>
        <div className="kpi"><span className="v">{organizations.length - paying.length - trials}</span><span className="k">essai terminé ou résilié</span></div>
      </div>
      <p className="muted small">Coût IA estimé sur 30 jours, toutes entreprises : ≈ {aiTotal.toFixed(2)} $ (tarif public Claude Opus 5.5, hors réductions du cache).</p>

      <section className="panel">
        <h2>Onboarder un nouveau client</h2>
        <p className="muted small">Créez son compte (essai gratuit), paramétrez ses recherches, séquences et prospects, puis envoyez le lien à son administrateur : tout sera prêt à sa première connexion.</p>
        <ClientForm />
      </section>

      <section className="panel flush">
        <div className="panel-head pad"><h2>Entreprises clientes</h2></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Entreprise</th><th>Administrateur</th><th>Membres</th><th>Abonnement</th><th>IA (30 jours)</th><th>Créée le</th><th aria-label="Actions" /></tr>
            </thead>
            <tbody>
              {organizations.length === 0 && (
                <tr><td colSpan={7} className="muted">Aucune entreprise pour l&apos;instant.</td></tr>
              )}
              {organizations.map((o) => (
                <tr key={o.id}>
                  <td><b>{o.name}</b></td>
                  <td>{o.memberships[0]?.user.email ?? <span className="muted">aucun</span>}</td>
                  <td className="num">{o._count.memberships}</td>
                  <td><span className={`chip ${["active", "past_due"].includes(states.get(o.id)!.kind) ? "ok" : states.get(o.id)!.kind === "blocked" ? "late" : ""}`}>{statusLabel(o.id)}</span></td>
                  <td className="num">{(() => { const u = ai.get(o.id); return u ? `${fmtTokens(u.i + u.o)} jetons · ≈ ${estimate(u.i, u.o).toFixed(2)} $` : <span className="muted">—</span>; })()}</td>
                  <td className="muted">{fmt(o.createdAt)}</td>
                  <td><div className="inline"><form action={enterOrganization}><input type="hidden" name="id" value={o.id} /><button className="btn sm primary" type="submit">Paramétrer</button></form><Link className="btn sm" href={`/super-admin/entreprises/${o.id}`}>Détail</Link></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel flush">
        <div className="panel-head pad"><h2>Derniers inscrits</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nom</th><th>Email</th><th>Entreprise</th><th>Inscrit le</th><th>Dernière connexion</th>{me.isFounder && <th>Super admin</th>}</tr></thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.name}</b>{u.isSuperAdmin && <span className="chip ok">super admin</span>}</td>
                  <td>{u.email}</td>
                  <td>{u.memberships.map((m) => m.organization.name).join(", ") || <span className="muted">aucune</span>}</td>
                  <td className="muted">{fmt(u.createdAt)}</td>
                  <td className="muted">{fmt(u.lastLoginAt)}</td>
                  {me.isFounder && (
                    <td>{isSuperAdminEmail(u.email) ? <span className="muted small">fondateur</span> : (
                      <form action={setSuperAdmin}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="on" value={u.isSuperAdmin ? "0" : "1"} /><button className="btn sm" type="submit">{u.isSuperAdmin ? "Retirer" : "Accorder"}</button></form>
                    )}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
