import type { Metadata } from "next";
import { requireMember, ROLES } from "@/lib/auth";
import { db } from "@/lib/db";
import { effectiveSignature } from "@/lib/prospecting";
import { OrgForm } from "./org-form";
import { SignatureForm } from "./signature-form";
import { AutoSendToggle } from "./auto-send-toggle";
import { DataPanel } from "./data-panel";
import { ConnectorTiles } from "./connector-tiles";

export const metadata: Metadata = { title: "Paramètres" };

// Paramètres : entreprise (gestionnaire), signature et envoi automatique des relances, puis les connecteurs en vignettes.
export default async function SettingsPage() {
  const { user, membership } = await requireMember();
  const org = membership.organization;
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
      {isAdmin && (
        <section className="panel">
          <h2>Entreprise</h2>
          <OrgForm name={org.name} defaultSignature={org.defaultSignature} />
        </section>
      )}
      <section className="panel stack">
        <h2>Signature des emails</h2>
        <p className="muted small">Elle remplace {"{signature}"} dans toutes vos séquences. Préremplie par votre gestionnaire, vous pouvez l&apos;adapter ; videz-la pour revenir à celle de l&apos;entreprise.</p>
        <SignatureForm signature={effectiveSignature(user, org, false)} />
        <AutoSendToggle on={user.autoSend} hasMailbox={hasMailbox} />
      </section>
      <ConnectorTiles userId={user.id} org={org} isAdmin={isAdmin} />
      {isAdmin && <DataPanel orgName={org.name} />}
    </div>
  );
}
