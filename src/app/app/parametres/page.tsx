import type { Metadata } from "next";
import Link from "next/link";
import { requireMember, ROLES } from "@/lib/auth";
import { OrgForm } from "./org-form";
import { SignatureForm } from "./signature-form";
import { DataPanel } from "./data-panel";
import { AutomationPanel } from "./automation-panel";
import { db } from "@/lib/db";
import { SettingsTabs } from "./settings-tabs";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const { user, membership } = await requireMember();
  const isAdmin = membership.role === ROLES.ADMIN;
  const hasMailbox = !!(await db.mailAccount.findUnique({ where: { userId: user.id }, select: { id: true } }));
  return (
    <div className="view narrow">
      <header className="view-head">
        <div>
          <h1>Paramètres</h1>
          <p className="muted">{user.name} · {user.email}</p>
        </div>
      </header>
      <SettingsTabs />
      <section className="panel" data-tip="Votre signature s'ajoute automatiquement à la fin de chaque email de vos séquences.">
        <h2>Signature des emails</h2>
        <p className="muted small">Elle remplace {"{signature}"} dans toutes vos séquences.</p>
        <SignatureForm signature={user.signature} />
      </section>
      <AutomationPanel autoSend={user.autoSend} weeklyReport={user.weeklyReport} isAdmin={isAdmin} hasMailbox={hasMailbox} />
      {isAdmin && (
        <>
          <section className="panel">
            <h2>Entreprise</h2>
            <OrgForm name={membership.organization.name} />
          </section>
          <section className="panel">
            <h2>Abonnement</h2>
            <p className="muted">Offre, paiement et factures : <Link href="/abonnement">gérer l&apos;abonnement</Link>.</p>
          </section>
          <DataPanel orgName={membership.organization.name} />
        </>
      )}
    </div>
  );
}
