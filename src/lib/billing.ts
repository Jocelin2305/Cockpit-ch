import Stripe from "stripe";
import { db } from "./db";
import { grantCredits, grantPlanCredits } from "./credits";
import { planById, planByPriceId, TRIAL_DAYS, TRIAL_SEATS } from "./plans";

export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;

let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe n'est pas configuré.");
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

type OrgBilling = {
  createdAt: Date;
  trialEndsAt: Date | null;
  plan: string;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  // Client d'un distributeur : son accès suit celui du distributeur, qui lui accorde son nombre d'utilisateurs.
  reseller?: { active?: boolean } | null;
  resellerSeats?: number | null;
};

// Statuts Stripe qui donnent accès : actif, essai Stripe, et impayé en cours de relance (Stripe retente le paiement).
const ACTIVE = ["active", "trialing", "past_due"];

export const trialEnd = (o: OrgBilling) => o.trialEndsAt ?? new Date(o.createdAt.getTime() + TRIAL_DAYS * 86_400_000);

export type AccessState =
  | { kind: "trial"; daysLeft: number; ends: Date }
  | { kind: "active"; planName: string; renews: Date | null; cancelAtPeriodEnd: boolean }
  | { kind: "past_due"; planName: string }
  | { kind: "blocked"; reason: "trial_over" | "canceled" | "unpaid" | "reseller" };

export function accessState(o: OrgBilling, now = new Date()): AccessState {
  if (o.reseller?.active === false) return { kind: "blocked", reason: "reseller" };
  const planName = planById(o.plan)?.name ?? "Abonnement actif";
  if (o.subscriptionStatus && ACTIVE.includes(o.subscriptionStatus)) {
    if (o.subscriptionStatus === "past_due") return { kind: "past_due", planName };
    return { kind: "active", planName, renews: o.currentPeriodEnd, cancelAtPeriodEnd: o.cancelAtPeriodEnd };
  }
  if (o.subscriptionStatus === "unpaid") return { kind: "blocked", reason: "unpaid" };
  if (o.subscriptionStatus === "canceled" || o.subscriptionStatus === "incomplete_expired") return { kind: "blocked", reason: "canceled" };
  const ends = trialEnd(o);
  if (ends > now) return { kind: "trial", daysLeft: Math.max(1, Math.ceil((ends.getTime() - now.getTime()) / 86_400_000)), ends };
  return { kind: "blocked", reason: "trial_over" };
}

export const hasAccess = (o: OrgBilling) => accessState(o).kind !== "blocked";

// Nombre d'utilisateurs autorisés : celui de l'offre, ou celui de l'essai.
export function seatLimit(o: OrgBilling) {
  const st = accessState(o);
  if (st.kind === "trial") return TRIAL_SEATS;
  return planById(o.plan)?.seats ?? o.resellerSeats ?? TRIAL_SEATS;
}

// Paiement d'un abonnement confirmé : crédite le quota du mois (une seule fois par facture).
export async function creditInvoice(sub: Stripe.Subscription, invoiceId: string) {
  const plan = planByPriceId(sub.items.data[0]?.price.id);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const org = await db.organization.findFirst({ where: sub.metadata?.organizationId ? { id: sub.metadata.organizationId } : { stripeCustomerId: customerId }, select: { id: true } });
  if (plan && org) await grantPlanCredits(org.id, plan.credits, invoiceId);
}

// Recharge payée : les crédits vont au portefeuille indiqué dans le paiement (une seule fois par paiement).
export async function creditCheckout(s: Stripe.Checkout.Session) {
  const m = s.metadata;
  const credits = parseInt(m?.credits ?? "", 10);
  if (s.mode !== "payment" || m?.kind !== "credits" || s.payment_status !== "paid" || !credits) return false;
  const wallet = m.resellerId ? { resellerId: m.resellerId } : m.organizationId ? { organizationId: m.organizationId } : null;
  if (!wallet) return false;
  await grantCredits(wallet, credits, "recharge", `Recharge de ${credits} crédits`, `paiement:${s.id}`);
  return true;
}

// Recopie l'état d'un abonnement Stripe sur l'entreprise. Appelée par le webhook et au retour du paiement.
export async function syncSubscription(sub: Stripe.Subscription) {
  const organizationId = sub.metadata?.organizationId;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];
  const plan = planByPriceId(item?.price.id);
  const where = organizationId ? { id: organizationId } : { stripeCustomerId: customerId };
  await db.organization.updateMany({
    where,
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      ...(plan ? { plan: plan.id } : {}),
    },
  });
}
