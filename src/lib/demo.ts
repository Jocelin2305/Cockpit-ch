// Démo instantanée : chaque visiteur de /demo reçoit son propre espace pré-rempli, supprimé après 24 heures.
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { hashPassword, ROLES } from "./auth";
import { ensureStandardTemplate } from "./cockpit";
import { addDays, todayISO } from "./prospecting";

export const DEMO_HOURS = 24;

const DEMO_PER_HOUR = 60;
export const DEMO_DOMAIN = "demo.cockpitch.local";

// Supprime les espaces de démo expirés et leurs comptes visiteurs.
export async function cleanupDemos() {
  const expired = await db.organization.findMany({ where: { isDemo: true, demoExpiresAt: { lt: new Date() } }, select: { id: true } });
  if (!expired.length) return 0;
  const ids = expired.map((o) => o.id);
  await db.$transaction([
    db.user.deleteMany({ where: { email: { endsWith: `@${DEMO_DOMAIN}` }, memberships: { every: { organizationId: { in: ids } } } } }),
    db.phoneEvent.deleteMany({ where: { organizationId: { in: ids } } }),
    db.aiUsage.deleteMany({ where: { organizationId: { in: ids } } }),
    db.organization.deleteMany({ where: { id: { in: ids } } }),
  ]);
  return ids.length;
}

type Seed = {
  company: string; sector: string; city: string; contactName?: string; contactRole?: string; phone?: string; email?: string;
  linkedin?: string; priority: "A" | "B" | "C"; status: string; angle?: string; angleDetail?: string; qualification?: string; notes?: string;
  contactedDaysAgo?: number; relances?: number; callBackIn?: number;
};

const PROSPECTS: Seed[] = [
  { company: "Clinique du Parc", sector: "Clinique privée MCO", city: "Lyon", contactName: "Claire Martin", contactRole: "Directrice des soins", phone: "+33 4 72 00 00 01", email: "c.martin@clinique-parc.example", linkedin: "https://www.linkedin.com/in/exemple", priority: "A", status: "A répondu", angle: "Trois postes d'infirmiers ouverts depuis 2 mois : réduire le temps de planification pour retenir les équipes.", angleDetail: "Trois postes d'infirmiers sont ouverts à la Clinique du Parc depuis septembre. Dans les établissements MCO, chaque poste vacant alourdit les plannings et accélère les départs des équipes en place. Nous aidons les directions des soins à réduire de moitié le temps consacré aux plannings, pour dégager du temps managérial et fidéliser les infirmiers. C'est un sujet que vous suivez en ce moment ?", qualification: "Recrute 3 IDE depuis septembre.", notes: "Intéressée, veut une démo avec son DRH.", contactedDaysAgo: 8, relances: 1, callBackIn: 0 },
  { company: "Polyclinique du Rhône", sector: "Polyclinique", city: "Villeurbanne", contactName: "Marc Dubois", contactRole: "Directeur général", phone: "+33 4 78 00 00 02", email: "m.dubois@polyclinique-rhone.example", priority: "A", status: "RDV planifié", angle: "Ouverture d'un nouveau bloc en 2027 : anticiper les plannings dès maintenant.", angleDetail: "La Polyclinique du Rhône a annoncé l'ouverture d'un nouveau bloc opératoire en 2027. Un bloc supplémentaire, ce sont des équipes à recruter et des plannings à recomposer, souvent dans l'urgence au moment de l'ouverture. Nous accompagnons les directions pour préparer cette montée en charge six mois à l'avance. Seriez-vous ouvert à un échange sur votre calendrier ?", qualification: "Nouveau bloc opératoire annoncé.", contactedDaysAgo: 15, relances: 2 },
  { company: "Clinique des Alpes", sector: "Clinique SSR", city: "Grenoble", contactName: "Sophie Bernard", contactRole: "Cadre de santé", phone: "+33 4 76 00 00 03", email: "s.bernard@clinique-alpes.example", priority: "B", status: "Relancé", angle: "Taux d'absentéisme élevé en SSR : sécuriser les remplacements.", contactedDaysAgo: 7, relances: 1 },
  { company: "Centre médical Bellecour", sector: "Centre de santé", city: "Lyon", contactName: "Julien Petit", contactRole: "Gérant", phone: "+33 4 72 00 00 04", email: "j.petit@cm-bellecour.example", priority: "B", status: "Contacté", angle: "Croissance rapide (2 médecins recrutés) : structurer l'organisation avant l'été.", contactedDaysAgo: 3 },
  { company: "Clinique Saint-Joseph", sector: "Clinique privée", city: "Annecy", contactName: "Nadia Haddad", contactRole: "DRH", email: "n.haddad@stjoseph.example", priority: "A", status: "À contacter", angle: "Nouvelle DRH arrivée en septembre : fenêtre idéale pour revoir les outils RH.", angleDetail: "Vous avez pris vos fonctions de DRH à la Clinique Saint-Joseph en septembre. Les premiers mois sont souvent le bon moment pour faire le point sur les outils et les irritants des équipes. Nous aidons les DRH de cliniques à objectiver ces irritants en deux semaines, avec un plan d'action priorisé. Cela vous parlerait-il d'en discuter ?", qualification: "Nommée DRH le 1er septembre." },
  { company: "Clinique Val d'Azergues", sector: "Clinique SSR", city: "Villefranche-sur-Saône", contactName: "Paul Moreau", contactRole: "Directeur", phone: "+33 4 74 00 00 06", email: "p.moreau@val-azergues.example", priority: "B", status: "À contacter", angle: "Extension de 20 lits annoncée : recruter et planifier sans surcharger les équipes." },
  { company: "Hôpital privé Est Lyonnais", sector: "Hôpital privé", city: "Bron", contactName: "Isabelle Roux", contactRole: "Directrice des opérations", phone: "+33 4 78 00 00 07", priority: "A", status: "Contacté", angle: "Groupe en rachat de cliniques : harmoniser les pratiques entre sites.", contactedDaysAgo: 2, callBackIn: 1 },
  { company: "Clinique du Mont-Blanc", sector: "Clinique privée", city: "Sallanches", priority: "C", status: "À contacter" },
  { company: "Centre de rééducation Les Cèdres", sector: "Rééducation", city: "Chambéry", contactName: "Thomas Lefèvre", contactRole: "Directeur adjoint", email: "t.lefevre@lescedres.example", priority: "B", status: "Perdu", angle: "Pas de budget avant 2027.", contactedDaysAgo: 30, relances: 5 },
  { company: "Clinique Saint-Vincent", sector: "Maternité privée", city: "Saint-Étienne", contactName: "Émilie Garnier", contactRole: "Directrice", phone: "+33 4 77 00 00 10", email: "e.garnier@st-vincent.example", priority: "A", status: "Gagné", angle: "Signé : déploiement sur 2 services.", contactedDaysAgo: 40, relances: 2 },
];

const DELAYS = [3, 7, 12, 20, 30];

// Crée l'espace de démo d'un visiteur et renvoie l'organisation et l'utilisateur à connecter.
export async function createDemo(source: string, guided: boolean) {
  await cleanupDemos().catch(() => 0);
  if ((await db.demoVisit.count({ where: { createdAt: { gte: new Date(Date.now() - 3600_000) } } })) >= DEMO_PER_HOUR) return null;

  const id = randomBytes(6).toString("hex");
  const expires = new Date(Date.now() + DEMO_HOURS * 3600_000);
  const today = todayISO();
  const org = await db.organization.create({ data: { name: "Démo — Conseil RH Santé", isDemo: true, demoExpiresAt: expires, trialEndsAt: expires } });
  const user = await db.user.create({
    data: {
      name: "Visiteur démo",
      // Première visite : visite guidée pas à pas et infobulles ; sinon, l'interface seule.
      tourStep: guided ? 0 : null,
      guideOn: guided,
      email: `visiteur-${id}@${DEMO_DOMAIN}`,
      // Mot de passe aléatoire jamais communiqué : on n'entre dans la démo que par le lien.
      passwordHash: await hashPassword(randomBytes(24).toString("base64url")),
      signature: "Camille Durand\nConsultante, Conseil RH Santé\n06 00 00 00 00",
      memberships: { create: { role: ROLES.ADMIN, organizationId: org.id } },
    },
  });
  await ensureStandardTemplate(org.id);
  const template = await db.sequenceTemplate.findFirst({ where: { organizationId: org.id }, select: { id: true } });
  const search = await db.search.create({
    data: {
      organizationId: org.id, name: "Cliniques privées — Auvergne-Rhône-Alpes", geo: "Auvergne-Rhône-Alpes", secteur: "Cliniques et établissements de santé privés",
      salaries: "50 à 500", motifs: "Recrutements en tension, ouvertures de services, nouvelles directions", fonctions: "Direction, DRH, direction des soins",
      templateId: template?.id ?? null, createdById: user.id,
    },
  });

  for (const s of PROSPECTS) {
    const first = s.contactedDaysAgo !== undefined ? addDays(today, -s.contactedDaysAgo) : null;
    const relances = s.relances ?? 0;
    const inSequence = ["Contacté", "Relancé"].includes(s.status);
    const p = await db.prospect.create({
      data: {
        organizationId: org.id, searchId: search.id, ownerId: user.id,
        company: s.company, sector: s.sector, city: s.city, contactName: s.contactName ?? "", contactRole: s.contactRole ?? "",
        phone: s.phone ?? "", email: s.email ?? "", linkedin: s.linkedin ?? "", priority: s.priority, status: s.status,
        angle: s.angle ?? "", angleDetail: s.angleDetail ?? "", qualification: s.qualification ?? "", notes: s.notes ?? "",
        firstContact: first, lastContact: first && relances ? addDays(first, DELAYS[relances - 1]) : first,
        relances, nextFollowUp: inSequence && first ? addDays(first, DELAYS[relances] ?? 30) : null,
        callBack: s.callBackIn !== undefined ? addDays(today, s.callBackIn) : null,
        qualif: s.status === "RDV planifié" || s.status === "Gagné" ? { fw: "BANT", v: { Budget: 2, Autorité: 2, Besoin: 2, Délai: 1 } } : undefined,
      },
    });
    if (first) {
      await db.mailMessage.create({ data: { organizationId: org.id, prospectId: p.id, userId: user.id, direction: "out", providerId: `demo-${p.id}-1`, subject: `${s.company} : vos recrutements infirmiers`, snippet: "Bonjour, j'ai vu que vous recrutiez…", at: new Date(Date.now() - (s.contactedDaysAgo ?? 0) * 86_400_000) } });
    }
    if (s.status === "A répondu")
      await db.mailMessage.create({ data: { organizationId: org.id, prospectId: p.id, userId: user.id, direction: "in", providerId: `demo-${p.id}-r`, subject: `Re: ${s.company} : vos recrutements infirmiers`, snippet: "Bonjour, votre message tombe bien. Pouvez-vous me rappeler cette semaine ? Notre DRH sera présent.", at: new Date(Date.now() - 20 * 3600_000) } });
    if (["A répondu", "RDV planifié", "Gagné", "Perdu"].includes(s.status))
      await db.call.create({
        data: {
          organizationId: org.id, prospectId: p.id, userId: user.id, day: addDays(today, -Math.min(3, s.contactedDaysAgo ?? 1)), issue: "Appel",
          durationMs: 6 * 60_000 + PROSPECTS.indexOf(s) * 40_000, interet: s.status === "Perdu" ? "faible" : "fort",
          resume: s.status === "Perdu" ? "Pas de budget cette année, à recontacter en 2027." : "Besoin confirmé, décideur identifié, prochaine étape fixée.",
          next: s.status === "RDV planifié" ? "Démo mardi 10 h avec la direction" : s.status === "A répondu" ? "Rappeler avec le DRH" : "",
        },
      });
  }
  // Appels sans réponse de la semaine, pour les statistiques.
  const contacted = await db.prospect.findMany({ where: { organizationId: org.id, phone: { not: "" } }, select: { id: true }, take: 4 });
  for (const [i, c] of contacted.entries())
    await db.call.create({ data: { organizationId: org.id, prospectId: c.id, userId: user.id, day: addDays(today, -i), issue: "Pas de réponse", durationMs: 25_000 } });
  await db.phoneEvent.create({
    data: { organizationId: org.id, externalId: `demo-${id}`, kind: "voicemail", number: "+33 4 72 00 00 01", userId: user.id, at: new Date(Date.now() - 3 * 3600_000), transcript: "Bonjour, c'est Claire Martin de la Clinique du Parc, je vous rappelle au sujet de votre message, je suis joignable cet après-midi." },
  });
  const firstProspect = await db.prospect.findFirst({ where: { organizationId: org.id, company: "Clinique du Parc" }, select: { id: true } });
  if (firstProspect) await db.phoneEvent.updateMany({ where: { organizationId: org.id }, data: { prospectId: firstProspect.id } });
  await db.demoVisit.create({ data: { organizationId: org.id, source: source.slice(0, 100) } });
  return { org, user };
}
