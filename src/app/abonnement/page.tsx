import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { SubmitButton } from "@/components/forms";
import { db } from "@/lib/db";
import { requireMember, ROLES } from "@/lib/auth";
import { accessState, creditCheckout, stripe, stripeEnabled, syncSubscription } from "@/lib/billing";
import { brandForOrg, supportEmail } from "@/lib/branding";
import { CREDIT_PACKS } from "@/lib/credit-grid";
import { creditBalance } from "@/lib/credits";
import { PLANS, priceIdFor } from "@/lib/plans";
import { BrandStyle } from "@/components/brand-style";
import { logout } from "../(auth)/actions";
import { buyCredits, openPortal, startCheckout } from "./actions";

export const metadata: Metadata = { title: "Abonnement" };

const ERRORS: Record<string, string> = {
  stripe: "Le paiement en ligne n'est pas encore configuré. Contactez le support.",
  offre: "Cette offre n'est pas disponible pour le moment.",
  deja: "Votre entreprise a déjà un abonnement actif : gérez-le avec « Gérer mon abonnement ».",
};
const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Client d'un distributeur : il gère son abonnement avec lui, sans prix ni paiement ici.
async function ResellerClientPage({ org, email }: { org: Parameters<typeof accessState>[0] & { name: string; resellerId: string | null }; email: string }) {
  const [brand, support] = await Promise.all([brandForOrg(org), supportEmail(org)]);
  const st = accessState(org);
  return (
    <main className="billing">
      <BrandStyle brand={brand} />
      <header className="row between">
        <Brand sub={org.name} brand={brand} />
        <div className="row">
          {st.kind !== "blocked" && <Link className="btn" href="/app">Retour à l&apos;espace</Link>}
          <form action={logout}><button className="btn ghost" type="submit">Se déconnecter</button></form>
        </div>
      </header>
      <section className="stack">
        <h1>Abonnement</h1>
        {st.kind === "trial" && <p className="alert">Essai gratuit : encore {st.daysLeft} jour{st.daysLeft > 1 ? "s" : ""}, jusqu&apos;au {fmt(st.ends)}.</p>}
        {st.kind === "active" && <p className="alert ok">Votre abonnement est actif.</p>}
        {st.kind === "blocked" && <p className="alert error">Votre accès est suspendu. Vos données sont conservées : contactez votre conseiller pour le rétablir.</p>}
        <p>Votre abonnement est géré par votre conseiller, qui répond à toutes vos questions : <a href={`mailto:${support}`}>{support}</a></p>
      </section>
      <p className="hint">Connecté en tant que {email}.</p>
    </main>
  );
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ session_id?: string; recharge?: string; erreur?: string }> }) {
  const { user, membership } = await requireMember({ allowInactive: true });
  const { session_id, recharge, erreur } = await searchParams;
  let org = membership.organization;
  if (org.resellerId) return <ResellerClientPage org={org} email={user.email} />;

  // Retour du paiement : on synchronise tout de suite, sans attendre le webhook.
  let thanks = false;
  let recharged = false;
  if (recharge && stripeEnabled()) {
    try {
      const s = await stripe().checkout.sessions.retrieve(recharge);
      if (s.client_reference_id === org.id) recharged = await creditCheckout(s);
    } catch {
      // Le webhook créditera la recharge quelques secondes plus tard.
    }
  }
  if (session_id && stripeEnabled()) {
    try {
      const s = await stripe().checkout.sessions.retrieve(session_id, { expand: ["subscription"] });
      if (s.client_reference_id === org.id && s.subscription && typeof s.subscription !== "string") {
        await syncSubscription(s.subscription);
        org = (await db.organization.findUnique({ where: { id: org.id }, include: { reseller: { select: { active: true } } } })) ?? org;
        thanks = true;
      }
    } catch {
      // Le webhook mettra l'abonnement à jour quelques secondes plus tard.
    }
  }

  const st = accessState(org);
  const isAdmin = membership.role === ROLES.ADMIN;
  const canPay = stripeEnabled() && PLANS.some((p) => priceIdFor(p));
  const balance = await creditBalance(org);

  return (
    <main className="billing">
      <header className="row between">
        <Brand sub={org.name} />
        <div className="row">
          {st.kind !== "blocked" && <Link className="btn" href="/app">Retour à l&apos;espace</Link>}
          <form action={logout}><button className="btn ghost" type="submit">Se déconnecter</button></form>
        </div>
      </header>

      <section className="stack">
        <h1>Abonnement</h1>
        {thanks && <p className="alert ok">Merci ! Votre abonnement est actif.</p>}
        {recharged && <p className="alert ok">Merci ! Vos crédits sont ajoutés.</p>}
        <p>Solde : <b>{balance.toLocaleString("fr-FR")} crédits</b>. <Link href="/app/parametres#credits">Voir le détail</Link></p>
        {erreur && ERRORS[erreur] && <p className="alert error">{ERRORS[erreur]}</p>}
        {st.kind === "trial" && <p className="alert">Essai gratuit : encore {st.daysLeft} jour{st.daysLeft > 1 ? "s" : ""}, jusqu&apos;au {fmt(st.ends)}. Toutes les fonctions sont ouvertes.</p>}
        {st.kind === "active" && (
          <p className="alert ok">
            {st.planName === "Abonnement actif" ? "Votre abonnement est actif." : `Offre ${st.planName} active.`}{" "}
            {st.renews && (st.cancelAtPeriodEnd ? `Résiliée : l'accès s'arrêtera le ${fmt(st.renews)}.` : `Prochain renouvellement le ${fmt(st.renews)}.`)}
          </p>
        )}
        {st.kind === "past_due" && <p className="alert error">Le dernier paiement a échoué. Stripe va le retenter : mettez à jour votre carte pour éviter la coupure.</p>}
        {st.kind === "blocked" && (
          <p className="alert error">
            {st.reason === "trial_over" ? "Votre essai gratuit est terminé." : st.reason === "unpaid" ? "Votre abonnement est suspendu pour impayé." : "Votre abonnement est résilié."}{" "}
            Vos données sont conservées : choisissez une offre pour retrouver l&apos;accès.
          </p>
        )}
      </section>

      {!isAdmin ? (
        <p className="muted">Seul un administrateur de l&apos;entreprise peut gérer l&apos;abonnement. Prévenez-le.</p>
      ) : st.kind === "active" || st.kind === "past_due" ? (
        <>
          <form action={openPortal}>
            <SubmitButton pending="Ouverture…">Gérer mon abonnement et mes factures</SubmitButton>
          </form>
          <section className="stack">
            <h2>Recharger mes crédits</h2>
            <p className="muted">Paiement unique, crédits valables 12 mois.</p>
            <div className="plans">
              {CREDIT_PACKS.map((p) => (
                <div key={p.id} className="plan-card">
                  <h2>{p.credits.toLocaleString("fr-FR")} crédits</h2>
                  <p className="price"><span className="mono">{p.price} €</span></p>
                  <form action={buyCredits}>
                    <input type="hidden" name="pack" value={p.id} />
                    <SubmitButton pending="Redirection vers le paiement…">Acheter</SubmitButton>
                  </form>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="plans">
          {PLANS.map((p) => (
            <div key={p.id} className="plan-card">
              <h2>{p.name}</h2>
              <p className="price"><span className="mono">{p.price} €</span> HT / mois</p>
              <p className="muted">{p.pitch}</p>
              <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <form action={startCheckout}>
                <input type="hidden" name="plan" value={p.id} />
                <SubmitButton pending="Redirection vers le paiement…">Choisir {p.name}</SubmitButton>
              </form>
            </div>
          ))}
        </div>
      )}
      {isAdmin && !canPay && <p className="hint">Paiement en ligne non configuré : renseignez les clés Stripe dans le fichier .env.</p>}
      {isAdmin && org.stripeCustomerId && st.kind !== "active" && st.kind !== "past_due" && canPay && (
        <form action={openPortal}><button className="btn ghost sm" type="submit">Voir mes anciennes factures</button></form>
      )}
      <p className="hint">Paiement sécurisé par Stripe. Connecté en tant que {user.email}.</p>
    </main>
  );
}
