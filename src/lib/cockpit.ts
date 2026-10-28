import { db } from "./db";
import { STANDARD_TEMPLATE, tplDelays } from "./prospecting";

// Toute entreprise dispose au moins de la séquence standard.
// Identifiant fixe par entreprise : deux chargements simultanés ne peuvent pas la créer deux fois.
export async function ensureStandardTemplate(organizationId: string) {
  const count = await db.sequenceTemplate.count({ where: { organizationId } });
  if (count > 0) return;
  try {
    await db.sequenceTemplate.upsert({
      where: { id: `std_${organizationId}` },
      update: {},
      create: { id: `std_${organizationId}`, organizationId, name: STANDARD_TEMPLATE.name, delays: STANDARD_TEMPLATE.delays, steps: STANDARD_TEMPLATE.steps },
    });
  } catch {
    // Création simultanée par un autre chargement : la séquence existe déjà.
  }
}

// Délais de relance applicables à un prospect : ceux de la séquence de sa recherche.
export async function delaysFor(organizationId: string, searchId: string | null) {
  if (!searchId) return tplDelays(null);
  const search = await db.search.findFirst({ where: { id: searchId, organizationId }, include: { template: true } });
  return tplDelays(search?.template?.delays);
}

// Vérifie qu'un identifiant appartient bien à l'entreprise avant de l'utiliser.
export async function ownedSearchId(organizationId: string, searchId: string | null | undefined) {
  if (!searchId) return null;
  const s = await db.search.findFirst({ where: { id: searchId, organizationId }, select: { id: true } });
  return s?.id ?? null;
}
export async function ownedTemplateId(organizationId: string, templateId: string | null | undefined) {
  if (!templateId) return null;
  const t = await db.sequenceTemplate.findFirst({ where: { id: templateId, organizationId }, select: { id: true } });
  return t?.id ?? null;
}
