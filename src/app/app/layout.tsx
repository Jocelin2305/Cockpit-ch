import Link from "next/link";
import { Brand } from "@/components/brand";
import { NavLinks, type NavItem } from "@/components/shell";
import { db } from "@/lib/db";
import { requireMember, ROLE_LABEL, ROLES } from "@/lib/auth";
import { ensureStandardTemplate } from "@/lib/cockpit";
import { isDue, todayISO } from "@/lib/prospecting";
import { logout } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, membership } = await requireMember();
  const orgId = membership.organizationId;
  const isAdmin = membership.role === ROLES.ADMIN;
  await ensureStandardTemplate(orgId);
  const [searches, followUps] = await Promise.all([
    db.search.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, _count: { select: { prospects: true } } }, orderBy: { createdAt: "asc" } }),
    db.prospect.findMany({
      where: { organizationId: orgId, status: { in: ["Contacté", "Relancé"] }, nextFollowUp: { not: null } },
      select: { status: true, relances: true, nextFollowUp: true },
    }),
  ]);
  const today = todayISO();
  const due = followUps.filter((p) => isDue(p, today)).length;

  const tools: NavItem[] = [
    { href: "/app", label: "Espace de travail" },
    { href: "/app/tableau-de-bord", label: "Tableau de bord", count: due || undefined, alert: due > 0 },
    { href: "/app/prospects", label: "Prospects" },
    { href: "/app/sequences", label: "Séquences" },
  ];
  const settings: NavItem[] = [
    { href: "/app/equipe", label: "Équipe" },
    { href: "/app/profil", label: "Profil" },
    ...(isAdmin ? [{ href: "/app/parametres", label: "Paramètres" }] : []),
    ...(user.isSuperAdmin ? [{ href: "/super-admin", label: "Super admin" }] : []),
  ];
  const library: NavItem[] = searches.map((s) => ({ href: `/app/recherches/${s.id}`, label: s.name, count: s._count.prospects }));

  return (
    <div className="shell">
      <aside className="rail">
        <Brand sub={membership.organization.name} />
        {isAdmin && <Link className="btn primary block" href="/app/recherches/nouvelle">+ Créer une recherche</Link>}
        <div className="navsec">
          <span className="label">Recherches</span>
          {library.length ? <NavLinks items={library} /> : <p className="muted small pad-x">Aucune recherche pour l&apos;instant.</p>}
        </div>
        <div className="navsec">
          <span className="label">Outils</span>
          <NavLinks items={tools} />
        </div>
        <div className="navsec">
          <span className="label">Compte</span>
          <NavLinks items={settings} />
        </div>
        <div className="rail-foot">
          <div>
            <b>{user.name}</b>
            <span className="muted small">{ROLE_LABEL[membership.role]}</span>
          </div>
          <form action={logout}>
            <button className="btn sm ghost" type="submit">Se déconnecter</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
