// Vérifie le registre de crédits sur la base locale : npx tsx --env-file=.env scripts/test-credits.ts
// Crée ses propres entreprises de test, puis les supprime. Aucun appel réel à Claude, Apollo ou Stripe.
import type Stripe from "stripe";
import { chargeFeature, refundCharge } from "../src/lib/ai";
import { enrichSearch } from "../src/lib/apollo";
import { accessState, creditCheckout, seatLimit } from "../src/lib/billing";
import { DAILY_CAP } from "../src/lib/credit-grid";
import { creditBalance, CreditError, creditsLeft, grantCredits, grantPlanCredits, grantTrialCredits, spendCredits, usedLastMonth, walletBalance } from "../src/lib/credits";
import { db } from "../src/lib/db";

let failed = 0;
const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "OK    " : "ÉCHEC "} ${name}${ok ? "" : ` : obtenu ${JSON.stringify(got)}, attendu ${JSON.stringify(want)}`}`);
};
const refused = (p: Promise<unknown>) => p.then(() => false, (e) => e instanceof CreditError);

async function main() {
  const tag = `test-credits-${Date.now()}`;
  const direct = await db.organization.create({ data: { name: tag } });
  const reseller = await db.reseller.create({ data: { email: `${tag}@exemple.fr`, code: tag, offer: "A" } });
  const client = await db.organization.create({ data: { name: `${tag}-client`, resellerId: reseller.id } });
  try {
    // Essai : une seule attribution.
    await grantTrialCredits(direct.id);
    await grantTrialCredits(direct.id);
    check("essai attribué une seule fois", await creditBalance(direct), 50);

    // Débit et refus sans solde.
    await spendCredits(direct, 20, "test");
    check("débit", await creditBalance(direct), 30);
    check("refus au-delà du solde", await refused(spendCredits(direct, 31, "test")), true);

    // Deux actions simultanées ne font jamais passer sous zéro.
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => spendCredits(direct, 10, "simultané")));
    check("8 débits simultanés de 10 sur 30 : 3 acceptés", results.filter((r) => r.status === "fulfilled").length, 3);
    check("solde jamais négatif", await creditBalance(direct), 0);

    // Facture : quota crédité une fois, et report limité à un mois de quota.
    await grantPlanCredits(direct.id, 500, `${tag}-f1`);
    await grantPlanCredits(direct.id, 500, `${tag}-f1`);
    check("une facture ne crédite qu'une fois", await creditBalance(direct), 500);
    await grantPlanCredits(direct.id, 500, `${tag}-f2`);
    check("report d'un mois", await creditBalance(direct), 1000);
    await grantPlanCredits(direct.id, 500, `${tag}-f3`);
    check("report plafonné à un mois de quota", await creditBalance(direct), 1000);

    // Recharge : créditée une fois, jamais perdue au renouvellement.
    const session = { id: `${tag}-s1`, mode: "payment", payment_status: "paid", metadata: { kind: "credits", credits: "500", organizationId: direct.id } } as unknown as Stripe.Checkout.Session;
    await creditCheckout(session);
    await creditCheckout(session);
    check("une recharge ne crédite qu'une fois", await creditBalance(direct), 1500);
    await grantPlanCredits(direct.id, 500, `${tag}-f4`);
    // 500 du nouveau mois + 500 reportés + 500 de recharge : seul le report est plafonné.
    check("recharge conservée au renouvellement", await creditBalance(direct), 1500);
    const unpaid = { ...session, id: `${tag}-s2`, payment_status: "unpaid" } as Stripe.Checkout.Session;
    check("paiement non abouti : rien", await creditCheckout(unpaid), false);

    // Plafond du jour.
    // 50 crédits déjà consommés aujourd'hui par les tests ci-dessus.
    check("crédits utilisables limités par le plafond", await creditsLeft(direct), DAILY_CAP - 50);
    await spendCredits(direct, DAILY_CAP - 50, "gros volume");
    check("plafond atteint malgré le solde", [await creditsLeft(direct), (await creditBalance(direct)) > 0], [0, true]);
    check("refus au-delà du plafond", await refused(spendCredits(direct, 1, "test")), true);

    // Client de revendeur : il consomme le stock du revendeur.
    await grantCredits({ resellerId: reseller.id }, 100, "manuel", "test");
    await spendCredits(client, 10, "test");
    check("stock du revendeur débité", await walletBalance({ resellerId: reseller.id }), 90);
    check("consommation du client comptée", await usedLastMonth(client.id), 10);
    check("solde vu pour le client = stock", await creditBalance(client), 90);

    // IA : débit au lancement, remboursé en cas d'échec, rien avec la clé du client.
    const ctx = { organizationId: client.id, userId: null };
    const charge = await chargeFeature(ctx, "sequence");
    check("séquence : 5 crédits", await creditBalance(client), 85);
    await refundCharge(ctx, charge);
    check("échec remboursé", await creditBalance(client), 90);
    await db.organization.update({ where: { id: client.id }, data: { aiKeyEnc: "x" } });
    check("clé du client : aucun débit", await chargeFeature(ctx, "sequence"), null);
    await db.organization.update({ where: { id: client.id }, data: { aiKeyEnc: null } });

    // Enrichissement avec la clé de la plateforme (réponses d'Apollo simulées) : débit seulement si un email est trouvé.
    process.env.APOLLO_API_KEY = "cle-de-test";
    const realFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response(JSON.stringify({ matches: [{ id: "a1", name: "Ana Test", email: "ana@exemple.fr", email_status: "verified" }, { id: "a2", name: "Sans Email" }] }), { status: 200 });
    }) as typeof fetch;
    const p1 = await db.prospect.create({ data: { organizationId: client.id, company: "A", contactName: "Ana Test", priority: "A" } });
    const p2 = await db.prospect.create({ data: { organizationId: client.id, company: "B", contactName: "Sans Email", priority: "B" } });
    const org = { id: client.id, apolloKeyEnc: null, resellerId: reseller.id };
    const e = await enrichSearch(org, {}, "");
    check("2 contacts traités", [e.done, e.found], [2, 2]);
    check("1 seul email trouvé : 1 crédit", await creditBalance(client), 89);
    await enrichSearch(org, { prospectId: p1.id }, "");
    check("même email réenrichi : aucun nouveau débit", await creditBalance(client), 89);
    check("Apollo a bien été appelé", calls > 0, true);
    await grantCredits({ resellerId: reseller.id }, -89, "manuel", "vidage");
    const before = calls;
    check("sans crédit : enrichissement refusé", await refused(enrichSearch(org, { prospectId: p2.id }, "")), true);
    check("sans crédit : Apollo n'est pas appelé", calls, before);
    globalThis.fetch = realFetch;
    delete process.env.APOLLO_API_KEY;

    // Accès : revendeur suspendu, formule et utilisateurs.
    const billing = { createdAt: new Date(), trialEndsAt: null, plan: "distributeur", subscriptionStatus: "active", currentPeriodEnd: null, cancelAtPeriodEnd: false };
    const active = accessState({ ...billing, reseller: { active: true } });
    check("libellé neutre pour le client", active.kind === "active" && active.planName, "Abonnement actif");
    check("revendeur suspendu : client bloqué", accessState({ ...billing, reseller: { active: false } }), { kind: "blocked", reason: "reseller" });
    check("utilisateurs réglés par le revendeur", seatLimit({ ...billing, resellerSeats: 12 }), 12);
  } finally {
    await db.creditEntry.deleteMany({ where: { OR: [{ organizationId: { in: [direct.id, client.id] } }, { resellerId: reseller.id }] } });
    await db.organization.deleteMany({ where: { id: { in: [direct.id, client.id] } } });
    await db.reseller.delete({ where: { id: reseller.id } });
    await db.$disconnect();
  }
  console.log(failed ? `\n${failed} échec(s)` : "\nTout est bon");
  process.exit(failed ? 1 : 0);
}
main();
