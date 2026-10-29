"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireReseller } from "@/lib/auth";
import { encrypt, MailError } from "@/lib/mail";
import { hasUpsells, offerById, OFFERS, PRIORITY_SUPPORT_HOURS, prioritySupport, validIban, validSiret } from "@/lib/resellers";
import { saveBrand } from "@/lib/brand-save";
import { emailField, firstError, type FormState } from "@/lib/validation";

const text = (label: string, max = 200) => z.string().trim().min(2, `${label} : à compléter.`).max(max, `${label} : trop long.`);

const dossierSchema = z.object({
  companyName: text("Nom de l'entreprise"),
  siret: z.string().transform((v) => v.replace(/\s/g, "")).refine(validSiret, "SIRET invalide (14 chiffres)."),
  address: text("Adresse", 300),
  managerName: text("Nom du gérant"),
  managerEmail: emailField,
  managerPhone: z.string().trim().regex(/^\+?[\d\s.()-]{8,20}$/, "Téléphone du gérant invalide."),
  bic: z.string().trim().toUpperCase().regex(/^([A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?)?$/, "BIC invalide (8 ou 11 caractères)."),
});

// Dossier du revendeur. L'IBAN n'est jamais renvoyé au navigateur : laissé vide, l'IBAN enregistré est conservé.
export async function saveDossier(_: FormState, form: FormData): Promise<FormState> {
  const { reseller } = await requireReseller();
  const values = Object.fromEntries(["companyName", "siret", "address", "managerName", "managerEmail", "managerPhone", "bic"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = dossierSchema.safeParse(values);
  if (!parsed.success) return { error: firstError(parsed.error), values };
  const iban = String(form.get("iban") ?? "").replace(/\s/g, "").toUpperCase();
  if (iban && !validIban(iban)) return { error: "IBAN invalide : vérifiez sa saisie.", values };
  let ibanData = {};
  try {
    if (iban) ibanData = { ibanEnc: encrypt(iban), ibanLast4: iban.slice(-4) };
  } catch (e) {
    return { error: e instanceof MailError ? "Enregistrement de l'IBAN impossible pour le moment : contactez le support." : "Enregistrement impossible.", values };
  }
  await db.reseller.update({ where: { id: reseller.id }, data: { ...parsed.data, ...ibanData } });
  revalidatePath("/super-admin/affilie");
  return { ok: "Dossier enregistré." };
}

// ---------- Offre, support, demandes de fonctionnalités, marque, clients ----------

// Choix de l'offre (A, B ou C) et des options ; l'activation suit le paiement.
export async function chooseOffer(_: FormState, form: FormData): Promise<FormState> {
  const { reseller } = await requireReseller();
  const offer = String(form.get("offer") ?? "");
  const billing = form.get("billing") === "annuel" ? "annuel" : "mensuel";
  if (!OFFERS.some((o) => o.id === offer)) return { error: "Choisissez une offre." };
  const up = hasUpsells(offer);
  const wl = up && form.get("whiteLabel") === "1";
  await db.reseller.update({
    where: { id: reseller.id },
    data: {
      offer, billing, offerChosenAt: new Date(), offerStatus: "en_attente",
      upsellWhiteLabel: wl, whiteLabelInstallments: wl && form.get("installments") === "3" ? 3 : 1,
      upsellPriority: up && form.get("priority") === "1",
    },
  });
  revalidatePath("/super-admin", "layout");
  return { ok: "Offre enregistrée : elle s'active à la réception du paiement." };
}

const ticketSchema = z.object({ subject: text("Objet", 150), body: text("Message", 5000) });

// Demande de support : prioritaire (4 h) avec l'offre C ou l'option, sinon 48 h.
export async function createTicket(_: FormState, form: FormData): Promise<FormState> {
  const { reseller } = await requireReseller();
  const values = { subject: String(form.get("subject") ?? ""), body: String(form.get("body") ?? "") };
  const parsed = ticketSchema.safeParse(values);
  if (!parsed.success) return { error: firstError(parsed.error), values };
  const priority = prioritySupport(reseller);
  const hours = priority ? PRIORITY_SUPPORT_HOURS : offerById(reseller.offer).supportHours;
  await db.supportTicket.create({ data: { ...parsed.data, resellerId: reseller.id, priority: priority ? "prioritaire" : "standard", dueAt: new Date(Date.now() + hours * 3600_000) } });
  revalidatePath("/super-admin", "layout");
  return { ok: `Demande envoyée : réponse visée sous ${hours} h.` };
}

// Ajoute n jours ouvrés (lundi à vendredi).
function addBusinessDays(d: Date, n: number) {
  const r = new Date(d);
  while (n > 0) { r.setDate(r.getDate() + 1); if (r.getDay() % 6) n--; }
  return r;
}

// Offre C : une demande de fonctionnalité par trimestre, réponse sous 10 jours ouvrés.
export async function createFeatureRequest(_: FormState, form: FormData): Promise<FormState> {
  const { reseller } = await requireReseller();
  if (reseller.offer !== "C" || reseller.offerStatus !== "actif") return { error: "Les demandes de fonctionnalité sont incluses dans l'offre C active." };
  const now = new Date();
  const quarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  if (await db.featureRequest.count({ where: { resellerId: reseller.id, createdAt: { gte: quarter } } })) return { error: "Vous avez déjà fait votre demande de ce trimestre." };
  const values = { title: String(form.get("title") ?? ""), body: String(form.get("body") ?? "") };
  const parsed = z.object({ title: text("Titre", 150), body: text("Description", 5000) }).safeParse(values);
  if (!parsed.success) return { error: firstError(parsed.error), values };
  await db.featureRequest.create({ data: { ...parsed.data, resellerId: reseller.id, dueAt: addBusinessDays(now, 10) } });
  revalidatePath("/super-admin", "layout");
  return { ok: "Demande envoyée : réponse sous 10 jours ouvrés (acceptée, refusée ou chiffrée)." };
}

// Pack de marque (marque blanche débloquée) : nom, logo, couleurs, typographie.
export async function saveMyBrand(_: FormState, form: FormData): Promise<FormState> {
  const { reseller } = await requireReseller();
  if (!reseller.whiteLabel) return { error: "La marque blanche n'est pas encore débloquée pour votre compte." };
  return saveBrand(reseller.id, form);
}

// Abonnement d'un client du distributeur : prix HT qu'il lui facture (base de la commission), activation ou suspension.
export async function setClientSubscription(form: FormData) {
  const { reseller } = await requireReseller();
  const org = await db.organization.findFirst({ where: { id: String(form.get("orgId")), resellerId: reseller.id }, select: { id: true } });
  if (!org) return;
  const on = form.get("on") === "1";
  const price = Math.max(0, Math.round(Number(String(form.get("price") ?? "").replace(",", ".")) * 100) / 100 || 0);
  const billing = form.get("billing") === "annuel" ? "annuel" : "mensuel";
  await db.organization.update({
    where: { id: org.id },
    data: on ? { subscriptionStatus: "active", plan: "distributeur", resellerPrice: price, resellerBilling: billing } : { subscriptionStatus: "canceled" },
  });
  revalidatePath("/super-admin", "layout");
}
