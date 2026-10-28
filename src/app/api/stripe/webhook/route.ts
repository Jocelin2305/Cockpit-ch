import type Stripe from "stripe";
import { stripe, syncSubscription } from "@/lib/billing";

// Stripe prévient l'application à chaque changement d'abonnement (paiement, renouvellement, impayé, résiliation).
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Webhook non configuré", { status: 400 });

  let event: Stripe.Event;
  try {
    // La signature se vérifie sur le corps brut, octet pour octet.
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
    case "checkout.session.completed": {
      const s = event.data.object;
      if (s.mode === "subscription" && s.subscription) {
        const id = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
        await syncSubscription(await stripe().subscriptions.retrieve(id));
      }
      break;
    }
    case "invoice.payment_failed":
    case "invoice.paid": {
      const sub = event.data.object.parent?.subscription_details?.subscription;
      if (sub) await syncSubscription(await stripe().subscriptions.retrieve(typeof sub === "string" ? sub : sub.id));
      break;
    }
  }
  return Response.json({ received: true });
}
