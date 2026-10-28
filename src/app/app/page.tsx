import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireMember, ROLES } from "@/lib/auth";
import { isDue, isEmail, todayISO } from "@/lib/prospecting";

export const metadata: Metadata = { title: "Espace de travail" };

export default async function WorkspacePage() {
  const { user, membership } = await requireMember();
  const orgId = membership.organizationId;
  const [prospects, searchCount, members] = await Promise.all([
    db.prospect.findMany({ where: { organizationId: orgId }, select: { status: true, relances: true, nextFollowUp: true, email: true, searchId: true } }),
    db.search.count({ where: { organizationId: orgId } }),
    db.membership.count({ where: { organizationId: orgId } }),
  ]);
  const today = todayISO();
  const due = prospects.filter((p) => isDue(p, today)).length;
  const ready = prospects.filter((p) => p.status === "À contacter" && p.searchId && isEmail(p.email)).length;
  const isAdmin = membership.role === ROLES.ADMIN;

  return (
    <div className="view narrow">
      <header className="view-head">
        <div>
          <span className="label">{membership.organization.name}</span>
          <h1>Bonjour {user.name.split(" ")[0]}</h1>
          <p className="muted">
            {due} relance{due > 1 ? "s" : ""} due{due > 1 ? "s" : ""} · {ready} email{ready > 1 ? "s" : ""} J0 prêt{ready > 1 ? "s" : ""} · {searchCount} recherche{searchCount > 1 ? "s" : ""} · {prospects.length} prospects
          </p>
        </div>
      </header>

      <section className="panel">
        <h2>L&apos;assistant arrive ici</h2>
        <p className="muted">
          Bientôt, vous écrirez ici vos demandes en une phrase (« relance tout ce qui est dû », « ajoute la société Durand à Lyon ») et
          l&apos;assistant agira directement dans l&apos;outil. C&apos;est la prochaine étape du sprint 2.
        </p>
        <div className="row">
          <Link className="btn primary" href="/app/tableau-de-bord">Ouvrir le Plan du jour</Link>
          {isAdmin && <Link className="btn" href="/app/recherches/nouvelle">+ Nouvelle recherche</Link>}
          {isAdmin && members === 1 && <Link className="btn" href="/app/equipe">Inviter l&apos;équipe</Link>}
        </div>
      </section>
    </div>
  );
}
