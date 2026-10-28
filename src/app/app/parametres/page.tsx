import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { OrgForm } from "./org-form";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const { membership } = await requireAdmin();
  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h1>Paramètres de l&apos;entreprise</h1>
          <p className="muted">Réservé aux administrateurs.</p>
        </div>
      </header>
      <section className="panel">
        <h2>Entreprise</h2>
        <OrgForm name={membership.organization.name} />
      </section>
      <section className="panel">
        <h2>Abonnement</h2>
        <p className="muted">Formule actuelle : <span className="chip">{membership.organization.plan}</span>. La gestion de l&apos;abonnement et des factures arrivera au sprint 3.</p>
      </section>
    </div>
  );
}
