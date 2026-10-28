"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { appUrl, requireAdmin } from "@/lib/auth";
import { stripe, stripeEnabled } from "@/lib/billing";
import { planById, priceIdFor } from "@/lib/plans";

// Crée (une seule fois) le client Stripe de l'entreprise.
async function customerFor(org: { id: string; name: string; stripeCustomerId: string | null }, email: string) {
  if (org.stripeCustomerId) return org.stripeCustomerId;
  const customer = await stripe().customers.create({ email, name: org.name, metadata: { organizationId: org.id } });
  await db.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export async function startCheckout(form: FormData) {
  const { user, membership } = await requireAdmin({ allowInactive: true });
  if (!stripeEnabled()) redirect("/abonnement?erreur=stripe");
  const plan = planById(String(form.get("plan")));
  const price = plan ? priceIdFor(plan) : null;
  if (!plan || !price) redirect("/abonnement?erreur=offre");
  const org = membership.organization;
  if (org.stripeSubscriptionId && ["active", "trialing", "past_due"].includes(org.subscriptionStatus ?? "")) redirect("/abonnement?erreur=deja");

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: await customerFor(org, user.email),
    line_items: [{ price, quantity: 1 }],
    client_reference_id: org.id,
    subscription_data: { metadata: { organizationId: org.id } },
    allow_promotion_codes: true,
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
    locale: "fr",
    success_url: `${appUrl()}/abonnement?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/abonnement`,
  });
  redirect(session.url ?? "/abonnement?erreur=stripe");
}

// Espace client Stripe : changer de carte, d'offre, télécharger les factures, résilier.
export async function openPortal() {
  const { membership } = await requireAdmin({ allowInactive: true });
  if (!stripeEnabled() || !membership.organization.stripeCustomerId) redirect("/abonnement?erreur=stripe");
  const portal = await stripe().billingPortal.sessions.create({
    customer: membership.organization.stripeCustomerId,
    return_url: `${appUrl()}/abonnement`,
  });
  redirect(portal.url);
}
