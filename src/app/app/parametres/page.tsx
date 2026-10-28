import type { Metadata } from "next";
import Link from "next/link";
import { requireMember, ROLES } from "@/lib/auth";
import { OrgForm } from "./org-form";
import { SignatureForm } from "./signature-form";
import { MailPanel } from "./mail-panel";
import { PhonePanel } from "./phone-panel";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ mail?: string }> }) {
  const { mail } = await searchParams;
  const { user, membership } = await requireMember();
  const isAdmin = membership.role === ROLES.ADMIN;
  return (
    <div className="view narrow">
      <header className="view-head">
        <div>
          <h1>Paramètres</h1>
          <p className="muted">{user.name} · {user.email}</p>
        </div>
      </header>
      <section className="panel" data-tip="Votre signature s'ajoute automatiquement à la fin de chaque email de vos séquences.">
        <h2>Signature des emails</h2>
        <p className="muted small">Elle remplace {"{signature}"} dans toutes vos séquences.</p>
        <SignatureForm signature={user.signature} />
      </section>
      <MailPanel userId={user.id} status={mail} />
      {isAdmin && (
        <>
          <PhonePanel provider={membership.organization.phoneProvider} token={membership.organization.phoneWebhookToken} />
          <section className="panel">
            <h2>Entreprise</h2>
            <OrgForm name={membership.organization.name} />
          </section>
          <section className="panel">
            <h2>Abonnement</h2>
            <p className="muted">Offre, paiement et factures : <Link href="/abonnement">gérer l&apos;abonnement</Link>.</p>
          </section>
        </>
      )}
    </div>
  );
}
