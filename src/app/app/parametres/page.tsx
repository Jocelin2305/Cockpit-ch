import type { Metadata } from "next";
import Link from "next/link";
import { requireMember, ROLES } from "@/lib/auth";
import { accessState } from "@/lib/billing";
import { supportEmail } from "@/lib/branding";
import { db } from "@/lib/db";
import { OrgForm } from "./org-form";
import { SignatureForm } from "./signature-form";
import { DataPanel } from "./data-panel";
import { AutomationPanel } from "./automation-panel";
import { ConnectorTiles } from "./connector-tiles";
import { CreditsPanel } from "./credits-panel";

export const metadata: Metadata = { title: "Paramètres" };

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

// Paramètres : signature, entreprise, abonnement, puis les connecteurs en vignettes.
export default async function SettingsPage() {
  const { user, membership } = await requireMember();
  const org = membership.organization;
  const isAdmin = membership.role === ROLES.ADMIN;
  const hasMailbox = !!(await db.mailAccount.findUnique({ where: { userId: user.id }, select: { id: true } }));
  const st = accessState(org);
  const support = org.resellerId ? await supportEmail(org) : "";
  const plan = st.kind === "trial" ? `Essai gratuit · ${st.daysLeft} jour${st.daysLeft > 1 ? "s" : ""} restant${st.daysLeft > 1 ? "s" : ""} (jusqu'au ${fmt(st.ends)})`
    : st.kind === "active" ? `${st.planName}${st.renews ? ` · ${st.cancelAtPeriodEnd ? "se termine" : "renouvelé"} le ${fmt(st.renews)}` : ""}`
    : st.kind === "past_due" ? `${st.planName} · paiement en échec` : "Aucun abonnement actif";
  return (
    <div className="view narrow">
      <header className="view-head">
        <div>
          <h1>Paramètres</h1>
          <p className="muted">{user.name} · {user.email}</p>
        </div>
      </header>
      <section className="panel">
        <h2>Signature des emails</h2>
        <p className="muted small">Elle remplace {"{signature}"} dans toutes vos séquences.</p>
        <SignatureForm signature={user.signature} />
      </section>
      {isAdmin && (
        <>
          <section className="panel">
            <h2>Entreprise</h2>
            <OrgForm name={org.name} />
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Abonnement en cours</h2>{!org.resellerId && <Link className="btn sm" href="/abonnement">Gérer l&apos;abonnement</Link>}</div>
            <p>{plan}</p>
            {org.resellerId && <p className="muted small">Géré par votre conseiller : <a href={`mailto:${support}`}>{support}</a></p>}
          </section>
        </>
      )}
      <CreditsPanel org={org} isAdmin={isAdmin} support={support} />
      <ConnectorTiles userId={user.id} org={org} isAdmin={isAdmin} />
      <AutomationPanel autoSend={user.autoSend} weeklyReport={user.weeklyReport} isAdmin={isAdmin} hasMailbox={hasMailbox} />
      {isAdmin && <DataPanel orgName={org.name} />}
    </div>
  );
}
