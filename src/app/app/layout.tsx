import Link from "next/link";
import { Brand } from "@/components/brand";
import { NavLinks, NavMenu, type NavItem } from "@/components/shell";
import { CallDock } from "@/components/call-dock";
import { Guide } from "@/components/guide";
import { Tour } from "@/components/tour";
import { db } from "@/lib/db";
import { requireMember, ROLE_LABEL } from "@/lib/auth";
import { ensureStandardTemplate } from "@/lib/cockpit";
import { accessState } from "@/lib/billing";
import { aiEnabled } from "@/lib/ai";
import { isDue, todayISO } from "@/lib/prospecting";
import { logout } from "../(auth)/actions";
import { leaveOrganization } from "../super-admin/actions";

// Heures restantes avant la suppression de l'espace de démo.
const demoHoursLeft = (end: Date | null) => Math.max(1, Math.ceil(((end?.getTime() ?? 0) - Date.now()) / 3600_000));

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, membership, onboarding } = await requireMember();
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
  const todo = due + callBacks;

  const tools: NavItem[] = [
    { href: "/app", label: "Espace de travail", count: todo || undefined, alert: todo > 0, tip: "Votre agent IA : il ouvre chaque journée avec votre point du jour, puis répond à toutes vos demandes." },
    { href: "/app/prospects", label: "Prospects", tip: "Vos bibliothèques de recherches et le tableau de suivi : cliquez sur T, E ou L pour voir les coordonnées, notez vos infos sur chaque ligne." },
    { href: "/app/sequences", label: "Séquences messages", tip: "Vos modèles d'emails (J0 + 5 relances) et de messages LinkedIn." },
    { href: "/app/tableau-de-bord", label: "Tableau de bord", tip: "Votre pipeline, vos stats d'appels et, pour le manager, celles de l'équipe." },
  ];
  const account: NavItem[] = [
    { href: "/app/equipe", label: "Équipe" },
    { href: "/app/parametres", label: "Paramètres", tip: "Signature des emails, entreprise et abonnement." },
    { href: "/app/aide", label: "Centre d'aide", tip: "Activez ou désactivez ce guide, retrouvez les réponses rapides et le support." },
    ...(user.isSuperAdmin ? [{ href: "/super-admin", label: "Super admin" }] : []),
  ];

  return (
    <div className="shell">
      <aside className="rail">
        <Brand sub={membership.organization.name} />
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
        {membership.organization.isDemo && (
          <p className="alert banner demo-banner">
            <span><b>Démo</b> : données fictives, à vous de cliquer partout. Cet espace s&apos;efface dans {demoHoursLeft(membership.organization.demoExpiresAt)} h.</span>
            <Link className="btn sm primary" href="/inscription">Créer mon espace · 14 jours gratuits</Link>
          </p>
        )}
        {!membership.organization.isDemo && billing.kind === "trial" && billing.daysLeft <= 5 && (
          <p className="alert banner">Essai gratuit : plus que {billing.daysLeft} jour{billing.daysLeft > 1 ? "s" : ""}. <Link href="/abonnement">Choisir une offre</Link></p>
        )}
        {billing.kind === "past_due" && (
          <p className="alert error banner">Le dernier paiement a échoué. <Link href="/abonnement">Mettre à jour le moyen de paiement</Link></p>
        )}
        {children}
      </main>
      <CallDock aiReady={aiEnabled()} />
      <Guide enabled={user.guideOn} />
      <Tour initialStep={user.tourStep} isDemo={membership.organization.isDemo} />
    </div>
  );
}
