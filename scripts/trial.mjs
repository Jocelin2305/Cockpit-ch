// Outil de test local : déplace la fin d'essai de toutes les entreprises de la base locale.
// Usage : node scripts/trial.mjs -1   (essai terminé hier)   |   node scripts/trial.mjs 14   (essai de 14 jours)
import { PrismaClient } from "@prisma/client";

const days = Number(process.argv[2] ?? 14);
const db = new PrismaClient();
const res = await db.organization.updateMany({ data: { trialEndsAt: new Date(Date.now() + days * 86_400_000) } });
console.log(`${res.count} entreprise(s) : fin d'essai dans ${days} jour(s)`);
await db.$disconnect();
