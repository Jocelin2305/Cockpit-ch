// Données de démonstration pour une base vide (développement uniquement).
// Usage : DEMO_PASSWORD=... node scripts/seed-demo.mjs
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const password = process.env.DEMO_PASSWORD;
if (!password) throw new Error("DEMO_PASSWORD manquant.");
const founder = (process.env.SUPER_ADMIN_EMAILS ?? "").split(",")[0].trim();
const db = new PrismaClient();
const hash = await bcrypt.hash(password, 12);

const org = await db.organization.create({ data: { name: "Démo Conseil", trialEndsAt: new Date(Date.now() + 14 * 86_400_000) } });
await db.user.create({ data: { name: "Jocelin Querteux", email: founder, passwordHash: hash, isSuperAdmin: true, memberships: { create: { role: "ADMIN", organizationId: org.id } } } });
await db.user.create({ data: { name: "Camille Test", email: "commercial.test@exemple.fr", passwordHash: hash, memberships: { create: { role: "MEMBER", organizationId: org.id } } } });
const search = await db.search.create({ data: { organizationId: org.id, name: "Cliniques privées — Auvergne-Rhône-Alpes", geo: "Auvergne-Rhône-Alpes", secteur: "Cliniques privées" } });
const rows = [
  { company: "Clinique du Parc (exemple)", sector: "Clinique privée MCO", city: "Lyon", contactName: "Dr Martin", contactRole: "Directeur", phone: "+33 4 72 00 00 00", email: "direction@clinique-parc.example", priority: "A", status: "A répondu", angle: "Recrutements infirmiers en tension : réduire le temps de planification." },
  { company: "Clinique des Alpes (exemple)", sector: "Clinique SSR", city: "Grenoble", priority: "B", status: "À contacter", email: "contact@clinique-alpes.example" },
  { company: "Polyclinique Rhône (exemple)", sector: "Polyclinique", city: "Villeurbanne", priority: "C", status: "À contacter" },
];
for (const r of rows) await db.prospect.create({ data: { organizationId: org.id, searchId: search.id, ...r } });
console.log("Démo créée.");
await db.$disconnect();
