import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireMember, ROLE_LABEL, ROLES } from "@/lib/auth";

export const metadata: Metadata = { title: "Espace de travail" };

export default async function WorkspacePage() {
  const { user, membership } = await requireMember();
  const orgId = membership.organizationId;
  const [members, pending] = await Promise.all([
    db.membership.count({ where: { organizationId: orgId } }),
    db.invitation.count({ where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: new Date() } } }),
  ]);
  const isAdmin = membership.role === ROLES.ADMIN;

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="label">{membership.organization.name}</span>
          <h1>Bonjour {user.name.split(" ")[0]}</h1>
          <p className="muted">Vous êtes {ROLE_LABEL[membership.role].toLowerCase()} de cet espace.</p>
        </div>
      </header>

      <div className="kpis">
        <div className="kpi"><span className="v">{members}</span><span className="k">membre{members > 1 ? "s" : ""}</span></div>
        <div className="kpi"><span className="v">{pending}</span><span className="k">invitation{pending > 1 ? "s" : ""} en attente</span></div>
        <div className="kpi"><span className="v">0</span><span className="k">prospects</span></div>
        <div className="kpi"><span className="v">0</span><span className="k">recherches</span></div>
      </div>

      {isAdmin && members === 1 && (
        <section className="cta">
          <div>
            <h2>Invitez vos commerciaux</h2>
            <p className="muted">Chacun aura son accès, avec le rôle que vous choisissez.</p>
          </div>
          <Link className="btn primary" href="/app/equipe">Inviter l&apos;équipe</Link>
        </section>
      )}

      <section className="panel">
        <h2>Le Cockpit arrive ici</h2>
        <p className="muted">
          L&apos;espace de travail avec l&apos;assistant IA, les recherches, les prospects, les séquences et les appels sont au programme du
          sprint 2. Le socle de comptes, d&apos;équipes et de rôles est en place.
        </p>
      </section>
    </div>
  );
}
