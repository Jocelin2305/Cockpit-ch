import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { accessState } from "@/lib/billing";
import { supportEmail } from "@/lib/branding";
import { CreditsPanel } from "./credits-panel";

export const metadata: Metadata = { title: "Abonnement" };

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

// Réservé au gestionnaire : abonnement en cours et consommation de crédits.
export default async function SubscriptionPage() {
  const { membership } = await requireAdmin();
  const org = membership.organization;
  const support = org.resellerId ? await supportEmail(org) : "";
  const st = accessState(org);
  const plan = st.kind === "trial" ? `Essai gratuit · ${st.daysLeft} jour${st.daysLeft > 1 ? "s" : ""} restant${st.daysLeft > 1 ? "s" : ""} (jusqu'au ${fmt(st.ends)})`
    : st.kind === "active" ? `${st.planName}${st.renews ? ` · ${st.cancelAtPeriodEnd ? "se termine" : "renouvelé"} le ${fmt(st.renews)}` : ""}`
    : st.kind === "past_due" ? `${st.planName} · paiement en échec` : "Aucun abonnement actif";
  return (
    <div className="view narrow">
      <header className="view-head">
        <div>
          <h1>Abonnement</h1>
          <p className="muted">Votre abonnement et votre consommation de crédits.</p>
        </div>
      </header>
      <section className="panel">
        <div className="panel-head"><h2>Abonnement en cours</h2>{!org.resellerId && <Link className="btn sm" href="/abonnement">Gérer l&apos;abonnement</Link>}</div>
        <p>{plan}</p>
        {org.resellerId && <p className="muted small">Géré par votre conseiller : <a href={`mailto:${support}`}>{support}</a></p>}
      </section>
      <CreditsPanel org={org} support={support} />
    </div>
  );
}
