// Registre des crédits : chaque mouvement est une ligne, le solde est leur somme.
// Portefeuille : celui de l'entreprise, ou celui de son revendeur si elle en a un (ses clients consomment son stock).
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { DAILY_CAP, TRIAL_CREDITS } from "./credit-grid";

// Erreur dont le message peut être montré tel quel à l'utilisateur.
export class CreditError extends Error {}

export type CreditOrg = { id: string; resellerId: string | null };
export type Wallet = { organizationId?: string; resellerId?: string };

const walletOf = (org: CreditOrg): Wallet => (org.resellerId ? { resellerId: org.resellerId } : { organizationId: org.id });
const whereWallet = (w: Wallet) => (w.resellerId ? { resellerId: w.resellerId } : { organizationId: w.organizationId, resellerId: null });
const lockKey = (w: Wallet) => (w.resellerId ? `credits:r:${w.resellerId}` : `credits:o:${w.organizationId}`);
const startOfDay = () => new Date(new Date().toISOString().slice(0, 10));

const sum = (r: { _sum: { delta: number | null } }) => r._sum.delta ?? 0;

export const walletBalance = async (w: Wallet) => sum(await db.creditEntry.aggregate({ where: whereWallet(w), _sum: { delta: true } }));
export const creditBalance = (org: CreditOrg) => walletBalance(walletOf(org));

const usedToday = async (organizationId: string, tx: Prisma.TransactionClient = db) =>
  0 - sum(await tx.creditEntry.aggregate({ where: { organizationId, kind: "use", createdAt: { gte: startOfDay() } }, _sum: { delta: true } }));

// Crédits utilisables maintenant : le solde, dans la limite du plafond du jour.
export async function creditsLeft(org: CreditOrg) {
  const [balance, used] = await Promise.all([creditBalance(org), usedToday(org.id)]);
  return Math.max(0, Math.min(balance, DAILY_CAP - used));
}

export const emptyMessage = (org: CreditOrg) =>
  org.resellerId ? "Crédits épuisés : contactez votre conseiller pour continuer." : "Crédits épuisés : rechargez-les depuis la page Abonnement.";

// Débite des crédits. `force` : la donnée est déjà livrée (email, téléphone), le mouvement est inscrit quel que soit le solde.
export async function spendCredits(org: CreditOrg, amount: number, label: string, opts: { userId?: string | null; force?: boolean } = {}) {
  if (amount <= 0) return;
  const wallet = walletOf(org);
  await db.$transaction(async (tx) => {
    // Un seul débit à la fois par portefeuille : deux actions simultanées ne peuvent pas passer sous zéro.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey(wallet)}))`;
    if (!opts.force) {
      const balance = sum(await tx.creditEntry.aggregate({ where: whereWallet(wallet), _sum: { delta: true } }));
      if (balance < amount) throw new CreditError(emptyMessage(org));
      if ((await usedToday(org.id, tx)) + amount > DAILY_CAP) throw new CreditError("Plafond quotidien de crédits atteint : réessayez demain ou contactez le support.");
    }
    await tx.creditEntry.create({ data: { organizationId: org.id, resellerId: org.resellerId, delta: -amount, kind: "use", label, userId: opts.userId ?? null } });
  });
}

// Rend les crédits d'une action qui a échoué.
export const refundCredits = (org: CreditOrg, amount: number, label: string, userId: string | null = null) =>
  db.creditEntry.create({ data: { organizationId: org.id, resellerId: org.resellerId, delta: amount, kind: "use", label: `Remboursement · ${label}`, userId } });

// Ajoute des crédits. `reference` (facture, paiement) : un même paiement ne crédite jamais deux fois.
export async function grantCredits(wallet: Wallet, amount: number, kind: string, label: string, reference: string | null = null) {
  try {
    await db.creditEntry.create({ data: { organizationId: wallet.organizationId ?? null, resellerId: wallet.resellerId ?? null, delta: amount, kind, label, reference } });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false;
    throw e;
  }
}

export const grantTrialCredits = (organizationId: string) => grantCredits({ organizationId }, TRIAL_CREDITS, "essai", "Crédits de l'essai gratuit", `essai:${organizationId}`);

// Quota mensuel d'un abonnement. Les crédits non utilisés sont reportés dans la limite d'un mois de quota ;
// les recharges des 12 derniers mois restent acquises.
export async function grantPlanCredits(organizationId: string, quota: number, invoiceId: string) {
  const wallet: Wallet = { organizationId };
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey(wallet)}))`;
    if (await tx.creditEntry.findUnique({ where: { reference: `facture:${invoiceId}` }, select: { id: true } })) return;
    const balance = sum(await tx.creditEntry.aggregate({ where: whereWallet(wallet), _sum: { delta: true } }));
    const bought = sum(await tx.creditEntry.aggregate({ where: { ...whereWallet(wallet), kind: "recharge", createdAt: { gte: new Date(Date.now() - 365 * 86_400_000) } }, _sum: { delta: true } }));
    const excess = balance - quota - bought;
    if (excess > 0) await tx.creditEntry.create({ data: { organizationId, delta: -excess, kind: "expiration", label: "Crédits non reportés (au-delà d'un mois de quota)" } });
    await tx.creditEntry.create({ data: { organizationId, delta: quota, kind: "abonnement", label: "Crédits de l'abonnement", reference: `facture:${invoiceId}` } });
  });
}

// Consommation nette des 30 derniers jours d'une entreprise.
export const usedLastMonth = async (organizationId: string) =>
  0 - sum(await db.creditEntry.aggregate({ where: { organizationId, kind: "use", createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } }, _sum: { delta: true } }));
