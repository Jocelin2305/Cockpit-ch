"use server";

import { effectiveSignature } from "@/lib/prospecting";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { MailError } from "@/lib/mail";
import { sendDue, sendStep } from "@/lib/mail-flow";

const BATCH_MAX = 50;
const message = (e: unknown) => (e instanceof MailError ? e.message : "L'envoi a échoué. Réessayez dans un instant.");

async function context() {
  const { user, membership } = await requireMember();
  const account = await db.mailAccount.findUnique({ where: { userId: user.id } });
  return { user, orgId: membership.organizationId, account, signature: effectiveSignature(user, membership.organization) };
}

export async function disconnectMail() {
  const { user } = await requireMember();
  await db.mailAccount.deleteMany({ where: { userId: user.id } });
  revalidatePath("/app/parametres", "layout");
}

// Envoie l'étape email suivante d'un prospect depuis la boîte connectée.
export async function sendNextEmail(prospectId: string) {
  const { user, orgId, account, signature } = await context();
  if (!account) return { error: "Connectez d'abord votre boîte mail dans Paramètres." };
  const p = await db.prospect.findFirst({ where: { id: prospectId, organizationId: orgId }, include: { search: { include: { template: true } } } });
  if (!p) return { error: "Prospect introuvable." };
  try {
    await sendStep(account, p, user.id, signature);
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath("/app", "layout");
  return { ok: `Email envoyé à ${p.email}.` };
}

// Toutes les relances dues (et, sur demande, les emails J0 prêts) en un clic.
export async function sendDueEmails(includeFirst: boolean) {
  const { orgId, account, signature } = await context();
  if (!account) return { error: "Connectez d'abord votre boîte mail dans Paramètres." };
  const r = await sendDue(account, orgId, signature, { includeFirst });
  revalidatePath("/app", "layout");
  if (!r.todo) return { ok: "Rien à envoyer pour l'instant." };
  return { ok: `${r.sent} email${r.sent > 1 ? "s" : ""} envoyé${r.sent > 1 ? "s" : ""}.`, error: r.errors.length ? `${r.errors.length} non envoyé(s) : ${r.errors.slice(0, 3).join(" ")}` : undefined };
}

// Lance la séquence d'une bibliothèque en un clic : email J0 à chaque prospect « À contacter » qui a un email.
// Les relances suivent ensuite les délais du modèle et s'envoient depuis le point du jour.
export async function launchSequence(searchId: string | null) {
  const { user, orgId, account, signature } = await context();
  if (!account) return { error: "Connectez d'abord votre boîte mail dans Paramètres." };
  const todo = await db.prospect.findMany({
    where: { organizationId: orgId, status: "À contacter", optOutAt: null, seqStoppedAt: null, email: { contains: "@" }, ...(searchId ? { searchId } : { searchId: { not: null } }) },
    include: { search: { include: { template: true } } },
    take: BATCH_MAX,
  });
  if (!todo.length) return { ok: "Aucun prospect à contacter avec un email dans cette bibliothèque." };
  let sent = 0;
  const errors: string[] = [];
  for (const p of todo) {
    try { await sendStep(account, p, user.id, signature); sent++; } catch (e) { errors.push(message(e)); if (!(e instanceof MailError)) break; }
  }
  revalidatePath("/app", "layout");
  return { ok: `Séquence lancée : ${sent} email${sent > 1 ? "s" : ""} J0 envoyé${sent > 1 ? "s" : ""}.${todo.length === BATCH_MAX ? " Recliquez pour les suivants." : ""}`, error: errors.length ? `${errors.length} non envoyé(s) : ${errors.slice(0, 3).join(" ")}` : undefined };
}
