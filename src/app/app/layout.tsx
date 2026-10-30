import Link from "next/link";
import { Suspense } from "react";
import { BackButton } from "@/components/back-button";
import { Brand } from "@/components/brand";
import { BrandStyle } from "@/components/brand-style";
import { brandForOrg, supportEmail } from "@/lib/branding";
import { NavLinks, NavMenu, type NavItem } from "@/components/shell";
import { CallDock } from "@/components/call-dock";
import { GuideButton, Tour } from "@/components/tour";
import { ContextMenus } from "@/components/context-menus";
import { ThemeToggle } from "@/components/theme-toggle";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import { getSession, requireMember, ROLE_LABEL, ROLES } from "@/lib/auth";
import { ensureStandardTemplate } from "@/lib/cockpit";
import { accessState } from "@/lib/billing";
import { aiEnabled } from "@/lib/ai";
import { creditBalance } from "@/lib/credits";
import { isDue, todayISO } from "@/lib/prospecting";
import { logout } from "../(auth)/actions";
import { leaveOrganization } from "../super-admin/actions";


export async function generateMetadata(): Promise<Metadata> {
  const session = await getSession();
  const brand = session?.membership ? await brandForOrg(session.membership.organization) : null;
  return brand?.name ? { title: { default: brand.name, template: `%s · ${brand.name}` } } : {};
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, membership, onboarding, reseller } = await requireMember();
  const orgId = membership.organizationId;
  await ensureStandardTemplate(orgId);
  const today = todayISO();
  const [followUps, callBacks] = await Promise.all([
    db.prospect.findMany({
      where: { organizationId: orgId, status: { in: ["Contacté", "Relancé"] }, nextFollowUp: { not: null } },
      select: { status: true, relances: true, nextFollowUp: true },
    }),
    db.prospect.count({ where: { organizationId: orgId, callBack: { not: null, lte: today }, status: { notIn: ["Gagné", "Perdu"] }, phone: { not: "" } } }),
  ]);
  const due = followUps.filter((p) => isDue(p, today)).length;
  const billing = accessState(membership.organization);
  const brand = await brandForOrg(membership.organization);
  const todo = due + callBacks;
  const org = membership.organization;
  // Le client d'un revendeur ne voit pas le stock de son revendeur ; il est prévenu quand celui-ci est vide.
  const credits = await creditBalance(org);
  const support = org.resellerId ? await supportEmail(org) : "";

  const tools: NavItem[] = [
    { href: "/app", label: "Copilote IA", count: todo || undefined, alert: todo > 0, tip: "Votre agent IA : il ouvre chaque journée avec votre point du jour, puis répond à toutes vos demandes." },
    { href: "/app/prospects", label: "Prospects", tip: "Vos bibliothèques de recherches et le tableau de suivi : cliquez sur T, E ou L pour voir les coordonnées, notez vos infos sur chaque ligne." },
    { href: "/app/sequences", label: "Séquences messages", tip: "Préparez vos modèles d'emails et de messages LinkedIn ; lancez-les depuis Prospects." },
    { href: "/app/tableau-de-bord", label: "Tableau de bord", tip: "Votre pipeline, vos stats d'appels et, pour le manager, celles de l'équipe." },
  ];
  const account: NavItem[] = [
    { href: "/app/equipe", label: "Équipe" },
    ...(membership.role === ROLES.ADMIN ? [{ href: "/app/abonnement", label: "Abonnement", tip: "Votre abonnement en cours et votre consommation de crédits." }] : []),
    { href: "/app/parametres", label: "Paramètres", tip: "Entreprise, signature, envoi automatique des relances et connecteurs (mailing, CRM, téléphonie)." },
    { href: "/app/aide", label: "Centre d'aide", tip: "Activez ou désactivez ce guide, retrouvez les réponses rapides et le support." },
    ...(reseller ? [{ href: "/super-admin/affilie", label: "Espace affilié" }] : []),
    ...(user.isSuperAdmin ? [{ href: "/super-admin", label: "Super admin" }] : reseller ? [{ href: "/super-admin", label: "Super admin revendeur" }] : []),
  ];

  return (
    <div className="shell">
      <BrandStyle brand={brand} />
      <aside className="rail">
        <Brand sub={membership.organization.name} brand={brand} />
        <Link className="btn primary rail-cta" data-tour="search" href={membership.role === ROLES.ADMIN ? "/app/recherches/nouvelle" : "/app/prospects"} data-tip="Lancez une nouvelle recherche : questionnaire de ciblage, prospects, séquence.">
          Rechercher des prospects
        </Link>
        <div className="navsec hl">
          <span className="label">Outils</span>
          <NavLinks items={tools} />
        </div>
        <NavMenu label="Compte" items={account} />
        {!org.resellerId && membership.role === ROLES.ADMIN && <Link className="rail-credits" href="/app/abonnement">{credits.toLocaleString("fr-FR")} crédits</Link>}
        <div className="rail-foot">
          <GuideButton />
          <div>
            <b>{user.name}</b>
            <span className="muted small">{onboarding ? "Super admin" : ROLE_LABEL[membership.role]}</span>
          </div>
          <form action={logout}>
            <button className="btn sm ghost" type="submit">Se déconnecter</button>
          </form>
        </div>
      </aside>
      <ThemeToggle />
      <main className="main">
        <Suspense fallback={null}><BackButton /></Suspense>
        {onboarding && (
          <form action={leaveOrganization} className="alert banner row between">
            <span>Vous paramétrez l&apos;espace de <b>{membership.organization.name}</b> en tant que super admin. Tout ce que vous créez ici appartient au client.</span>
            <button className="btn sm" type="submit">Quitter cet espace</button>
          </form>
        )}
        {billing.kind === "trial" && billing.daysLeft <= 5 && (
          <p className="alert banner">Essai gratuit : plus que {billing.daysLeft} jour{billing.daysLeft > 1 ? "s" : ""}. {org.resellerId ? <>Votre conseiller : <a href={`mailto:${support}`}>{support}</a></> : <Link href="/abonnement">Choisir une offre</Link>}</p>
        )}
        {credits <= 0 && (
          <p className="alert error banner">Crédits épuisés : l&apos;IA et l&apos;enrichissement sont en pause. {org.resellerId ? <>Contactez votre conseiller : <a href={`mailto:${support}`}>{support}</a></> : <Link href="/abonnement">Voir mes options</Link>}</p>
        )}
        {billing.kind === "past_due" && !org.resellerId && (
          <p className="alert error banner">Le dernier paiement a échoué. <Link href="/abonnement">Mettre à jour le moyen de paiement</Link></p>
        )}
        {children}
      </main>
      <CallDock aiReady={aiEnabled()} />
      <Tour initialStep={user.tourStep} />
      <ContextMenus isAdmin={membership.role === ROLES.ADMIN} />
    </div>
  );
}
