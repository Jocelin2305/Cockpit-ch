import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSuperAdmin, ROLE_LABEL } from "@/lib/auth";

export const metadata: Metadata = { title: "Entreprise" };

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "jamais");

export default async function OrganizationDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const org = await db.organization.findUnique({
    where: { id },
    include: {
      memberships: { include: { user: true }, orderBy: { createdAt: "asc" } },
      invitations: { where: { acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } },
      searches: { include: { _count: { select: { prospects: true } } }, orderBy: { createdAt: "desc" } },
      _count: { select: { prospects: true, templates: true } },
    },
  });
  if (!org) notFound();

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <Link href="/super-admin" className="small">← Vue d&apos;ensemble</Link>
          <h1>{org.name}</h1>
          <p className="muted">Créée le {fmt(org.createdAt)} · formule <span className="chip">{org.plan}</span></p>
        </div>
      </header>

      <section className="panel flush">
        <div className="panel-head pad"><h2>Membres</h2><span className="label">{org.memberships.length}</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Inscrit le</th><th>Dernière connexion</th></tr></thead>
            <tbody>
              {org.memberships.map((m) => (
                <tr key={m.id}>
                  <td><b>{m.user.name}</b></td>
                  <td>{m.user.email}</td>
                  <td>{ROLE_LABEL[m.role]}</td>
                  <td className="muted">{fmt(m.user.createdAt)}</td>
                  <td className="muted">{fmt(m.user.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {org.invitations.length > 0 && (
        <section className="panel flush">
          <div className="panel-head pad"><h2>Invitations en attente</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Email</th><th>Rôle</th><th>Expire le</th></tr></thead>
              <tbody>
                {org.invitations.map((i) => (
                  <tr key={i.id}><td>{i.email}</td><td>{ROLE_LABEL[i.role]}</td><td className="muted">{fmt(i.expiresAt)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Données commerciales</h2>
        <p className="muted">{org.searches.length} recherche(s) · {org._count.prospects} prospect(s) · {org._count.templates} séquence(s)</p>
        <div className="list">
          {org.searches.map((s) => (
            <div key={s.id} className="li"><b>{s.name}</b><span className="muted small">{s._count.prospects} prospects · créée le {fmt(s.createdAt)}</span></div>
          ))}
        </div>
      </section>
    </div>
  );
}
