"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { appUrl, hashToken, newToken, requireSuperAdmin, ROLES } from "@/lib/auth";
import { inviteEmail, sendPlatformEmail } from "@/lib/email";
import { newResellerCode, OFFERS, VIDEO_CATEGORIES } from "@/lib/resellers";
import { emailField, firstError, nameField, type FormState } from "@/lib/validation";
import { saveBrand } from "@/lib/brand-save";

const INVITE_DAYS = 14;
const PATH = "/super-admin/partenaires";

// Réservé au fondateur.
async function requireFounder() {
  const session = await requireSuperAdmin();
  if (!session.user.isFounder) redirect("/super-admin");
  return session;
}

const resellerSchema = z.object({
  company: nameField,
  email: emailField,
  offer: z.enum(OFFERS.map((o) => o.id) as [string, ...string[]], { error: "Formule inconnue." }),
});

// Crée un revendeur. Sans compte existant, on lui ouvre aussi son propre espace (accès offert) et on l'invite.
export async function createReseller(_: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireFounder();
  const values = { company: String(form.get("company") ?? ""), email: String(form.get("email") ?? ""), offer: String(form.get("offer") ?? "") };
  const parsed = resellerSchema.safeParse(values);
  if (!parsed.success) return { error: firstError(parsed.error), values };
  const { company, email, offer } = parsed.data;
  if (await db.reseller.findUnique({ where: { email } })) return { error: "Ce revendeur existe déjà.", values };

  await db.reseller.create({ data: { email, offer, companyName: company, managerEmail: email, code: newResellerCode() } });
  revalidatePath(PATH, "layout");
  if (await db.user.findUnique({ where: { email } })) return { ok: `${company} est revendeur : son accès apparaît à sa prochaine connexion.` };

  const token = newToken();
  const org = await db.organization.create({
    data: {
      name: company,
      isPartner: true,
      plan: "partenaire",
      subscriptionStatus: "active",
      invitations: { create: { email, role: ROLES.ADMIN, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000), invitedById: user.id } },
    },
  });
  const link = `${appUrl()}/invitation/${token}`;
  const mail = inviteEmail(org.name, "administrateur", link, INVITE_DAYS);
  const sent = form.get("send") === "1" && (await sendPlatformEmail(email, mail.subject, mail.text));
  return {
    ok: sent ? `${company} est créé et l'invitation est partie à ${email}.` : `${company} est créé. Envoyez-lui ce lien (valable ${INVITE_DAYS} jours) :`,
    link: sent ? undefined : link,
  };
}

export async function updateReseller(form: FormData) {
  await requireFounder();
  const id = String(form.get("id"));
  const offer = String(form.get("offer") ?? "");
  const active = form.get("active");
  await db.reseller.update({
    where: { id },
    data: { ...(OFFERS.some((o) => o.id === offer) ? { offer } : {}), ...(active !== null ? { active: active === "1" } : {}) },
  });
  revalidatePath(PATH, "layout");
}

// Rattache (ou détache) un client à un revendeur.
export async function assignReseller(form: FormData) {
  await requireFounder();
  const orgId = String(form.get("orgId"));
  const resellerId = String(form.get("resellerId") ?? "") || null;
  await db.organization.update({ where: { id: orgId }, data: { resellerId } });
  revalidatePath(`/super-admin/entreprises/${orgId}`);
  revalidatePath(PATH, "layout");
}

const messageSchema = z.object({
  subject: z.string().trim().min(2, "Ajoutez un objet.").max(150, "Objet trop long."),
  body: z.string().trim().min(5, "Ajoutez un message.").max(5000, "Message trop long (5 000 caractères)."),
});

// Communication à tous les revendeurs actifs : visible dans leur Espace affilié, et envoyée par email si demandé.
export async function sendResellerMessage(_: FormState, form: FormData): Promise<FormState> {
  await requireFounder();
  const values = { subject: String(form.get("subject") ?? ""), body: String(form.get("body") ?? "") };
  const parsed = messageSchema.safeParse(values);
  if (!parsed.success) return { error: firstError(parsed.error), values };
  const resellers = await db.reseller.findMany({ where: { active: true }, select: { email: true } });
  let emailed = 0;
  if (form.get("email") === "1")
    for (const r of resellers) if (await sendPlatformEmail(r.email, parsed.data.subject, `${parsed.data.body}\n\n— Cockpit'ch, espace partenaires : ${appUrl()}/super-admin/affilie`)) emailed++;
  await db.resellerMessage.create({ data: { ...parsed.data, emailed } });
  revalidatePath(PATH, "layout");
  return { ok: `Publié dans l'Espace affilié de ${resellers.length} revendeur${resellers.length > 1 ? "s" : ""}${form.get("email") === "1" ? ` · ${emailed} email${emailed > 1 ? "s" : ""} envoyé${emailed > 1 ? "s" : ""}` : ""}.` };
}

const videoSchema = z.object({
  title: z.string().trim().min(2, "Ajoutez un titre.").max(150),
  url: z.url({ error: "Lien invalide." }).refine((u) => /^https:\/\//.test(u), "Le lien doit commencer par https://"),
  category: z.enum(VIDEO_CATEGORIES.map((c) => c.id) as [string, ...string[]]),
});

export async function addVideo(_: FormState, form: FormData): Promise<FormState> {
  await requireFounder();
  const values = { title: String(form.get("title") ?? ""), url: String(form.get("url") ?? "").trim(), category: String(form.get("category") ?? "") };
  const parsed = videoSchema.safeParse(values);
  if (!parsed.success) return { error: firstError(parsed.error), values };
  await db.resellerVideo.create({ data: parsed.data });
  revalidatePath(PATH, "layout");
  return { ok: "Vidéo ajoutée au centre d'aide affilié." };
}

export async function deleteVideo(form: FormData) {
  await requireFounder();
  await db.resellerVideo.deleteMany({ where: { id: String(form.get("id")) } });
  revalidatePath(PATH, "layout");
}

// ---------- Offres, marque blanche, support ----------

// Paiement reçu : l'offre du distributeur devient active (avec ses options).
export async function activateOffer(form: FormData) {
  await requireFounder();
  const on = form.get("on") === "1";
  await db.reseller.update({ where: { id: String(form.get("id")) }, data: { offerStatus: on ? "actif" : "en_attente" } });
  revalidatePath(PATH, "layout");
}

// Le fondateur débloque (ou retire) la marque blanche et l'onglet « Personnalisation » du distributeur.
export async function setWhiteLabel(form: FormData) {
  await requireFounder();
  await db.reseller.update({ where: { id: String(form.get("id")) }, data: { whiteLabel: form.get("on") === "1" } });
  revalidatePath("/", "layout");
}

export async function saveResellerBrand(_: FormState, form: FormData): Promise<FormState> {
  await requireFounder();
  return saveBrand(String(form.get("resellerId")), form);
}

export async function answerTicket(form: FormData) {
  await requireFounder();
  const status = String(form.get("status") ?? "répondu");
  await db.supportTicket.update({ where: { id: String(form.get("id")) }, data: { answer: String(form.get("answer") ?? "").slice(0, 5000), status: ["ouvert", "répondu", "clos"].includes(status) ? status : "répondu" } });
  revalidatePath(PATH, "layout");
}

export async function answerFeature(form: FormData) {
  await requireFounder();
  const status = String(form.get("status") ?? "");
  await db.featureRequest.update({ where: { id: String(form.get("id")) }, data: { answer: String(form.get("answer") ?? "").slice(0, 5000), ...(["reçue", "acceptée", "refusée", "chiffrée"].includes(status) ? { status } : {}) } });
  revalidatePath(PATH, "layout");
}
