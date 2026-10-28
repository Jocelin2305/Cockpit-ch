import Link from "next/link";
import { Brand } from "@/components/brand";
import { NavLinks, NavMenu, type NavItem } from "@/components/shell";
import { CallDock } from "@/components/call-dock";
import { Guide } from "@/components/guide";
import { db } from "@/lib/db";
import { requireMember, ROLE_LABEL, ROLES } from "@/lib/auth";
import { ensureStandardTemplate } from "@/lib/cockpit";
import { accessState } from "@/lib/billing";
import { aiEnabled } from "@/lib/ai";
import { isDue, todayISO } from "@/lib/prospecting";
import { logout } from "../(auth)/actions";
import { leaveOrganization } from "../super-admin/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, membership, onboarding } = await requireMember();
  const orgId = membership.organizationId;
  const isAdmin = membership.role === ROLES.ADMIN;
  await ensureStandardTemplate(orgId);
  const today = todayISO();
  const [searches, followUps, callBacks] = await Promise.all([
    db.search.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, _count: { select: { prospects: true } } }, orderBy: { createdAt: "asc" } }),
    db.prospect.findMany({
      where: { organizationId: orgId, status: { in: ["Contacté", "Relancé"] }, nextFollowUp: { not: null } },
      select: { status: true, relances: true, nextFollowUp: true },
    }),
    db.prospect.count({ where: { organizationId: orgId, callBack: { not: null, lte: today }, status: { notIn: ["Gagné", "Perdu"] }, phone: { not: "" } } }),
  ]);
  const due = followUps.filter((p) => isDue(p, today)).length;
  const billing = accessState(membership.organization);
  const todo = due + callBacks;

  const tools: NavItem[] = [
    { href: "/app/point-du-jour", label: "Point du jour", count: todo || undefined, alert: todo > 0, tip: "Votre journée en un coup d'œil : rappels, relances, emails à envoyer. Il s'ouvre à chaque connexion." },
    { href: "/app", label: "Espace de travail", tip: "Demandez ce que vous voulez à l'assistant, comme dans une conversation." },
    { href: "/app/tableau-de-bord", label: "Tableau de bord", tip: "Votre pipeline, vos stats d'appels et, pour le manager, celles de l'équipe." },
    { href: "/app/prospects", label: "Prospects", tip: "Le tableau de suivi : cliquez sur un numéro pour appeler, notez vos infos sur chaque ligne." },
    { href: "/app/sequences", label: "Séquences", tip: "Vos modèles d'emails (J0 + 5 relances) et de messages LinkedIn." },
  ];
  const account: NavItem[] = [
    { href: "/app/equipe", label: "Équipe" },
    { href: "/app/parametres", label: "Paramètres", tip: "Signature des emails, entreprise et abonnement." },
    { href: "/app/aide", label: "Centre d'aide", tip: "Activez ou désactivez ce guide, retrouvez les réponses rapides et le support." },
    ...(user.isSuperAdmin ? [{ href: "/super-admin", label: "Super admin" }] : []),
  ];
  const library: NavItem[] = searches.map((s) => ({ href: `/app/recherches/${s.id}`, label: s.name, count: s._count.prospects }));

  return (
    <div className="shell">
      <aside className="rail">
        <Brand sub={membership.organization.name} />
        {isAdmin && <Link className="btn primary block" href="/app/recherches/nouvelle" data-tip="Lancez une nouvelle cible : le questionnaire prépare la recherche et sa séquence en 2 minutes.">+ Créer une recherche</Link>}
        <div className="navsec">
          <span className="label">Recherches</span>
          {library.length ? <NavLinks items={library} /> : <p className="muted small pad-x">Aucune recherche pour l&apos;instant.</p>}
        </div>
        <div className="navsec hl">
          <span className="label">Outils</span>
          <NavLinks items={tools} />
        </div>
        <NavMenu label="Compte" items={account} />
        <div className="rail-foot">
          <div>
            <b>{user.name}</b>
            <span className="muted small">{onboarding ? "Super admin" : ROLE_LABEL[membership.role]}</span>
          </div>
          <form action={logout}>
            <button className="btn sm ghost" type="submit">Se déconnecter</button>
          </form>
        </div>
      </aside>
      <main className="main">
        {onboarding && (
          <form action={leaveOrganization} className="alert banner row between">
            <span>Vous paramétrez l&apos;espace de <b>{membership.organization.name}</b> en tant que super admin. Tout ce que vous créez ici appartient au client.</span>
            <button className="btn sm" type="submit">Quitter cet espace</button>
          </form>
        )}
        {billing.kind === "trial" && billing.daysLeft <= 5 && (
          <p className="alert banner">Essai gratuit : plus que {billing.daysLeft} jour{billing.daysLeft > 1 ? "s" : ""}. <Link href="/abonnement">Choisir une offre</Link></p>
        )}
        {billing.kind === "past_due" && (
          <p className="alert error banner">Le dernier paiement a échoué. <Link href="/abonnement">Mettre à jour le moyen de paiement</Link></p>
        )}
        {children}
      </main>
      <CallDock aiReady={aiEnabled()} />
      <Guide enabled={user.guideOn} />
    </div>
  );
}
