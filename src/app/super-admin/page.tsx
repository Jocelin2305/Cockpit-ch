import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireSuperAdmin, ROLES } from "@/lib/auth";

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
  ]);
}

export default async function SuperAdminPage() {
  await requireSuperAdmin();
  const [organizations, userCount, newUsers, activeUsers, recentUsers] = await loadOverview();

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

      <section className="panel flush">
        <div className="panel-head pad"><h2>Entreprises clientes</h2></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Entreprise</th><th>Administrateur</th><th>Membres</th><th>Formule</th><th>Créée le</th><th aria-label="Actions" /></tr>
            </thead>
            <tbody>
              {organizations.length === 0 && (
                <tr><td colSpan={6} className="muted">Aucune entreprise pour l&apos;instant.</td></tr>
              )}
              {organizations.map((o) => (
                <tr key={o.id}>
                  <td><b>{o.name}</b></td>
                  <td>{o.memberships[0]?.user.email ?? <span className="muted">aucun</span>}</td>
                  <td className="num">{o._count.memberships}</td>
                  <td><span className="chip">{o.plan}</span></td>
                  <td className="muted">{fmt(o.createdAt)}</td>
                  <td><Link className="btn sm" href={`/super-admin/entreprises/${o.id}`}>Détail</Link></td>
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
            <thead><tr><th>Nom</th><th>Email</th><th>Entreprise</th><th>Inscrit le</th><th>Dernière connexion</th></tr></thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.name}</b>{u.isSuperAdmin && <span className="chip ok">super admin</span>}</td>
                  <td>{u.email}</td>
                  <td>{u.memberships.map((m) => m.organization.name).join(", ") || <span className="muted">aucune</span>}</td>
                  <td className="muted">{fmt(u.createdAt)}</td>
                  <td className="muted">{fmt(u.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
