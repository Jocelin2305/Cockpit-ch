"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { MailError } from "@/lib/mail";
import { sendStep, syncReplies } from "@/lib/mail-flow";
import { isDue, todayISO } from "@/lib/prospecting";

const BATCH_MAX = 50;
const message = (e: unknown) => (e instanceof MailError ? e.message : "L'envoi a échoué. Réessayez dans un instant.");

async function context() {
  const { user, membership } = await requireMember();
  const account = await db.mailAccount.findUnique({ where: { userId: user.id } });
  return { user, orgId: membership.organizationId, account, signature: user.signature || user.name };
}

export async function disconnectMail() {
  const { user } = await requireMember();
  await db.mailAccount.deleteMany({ where: { userId: user.id } });
  revalidatePath("/app/parametres");
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
  const { user, orgId, account, signature } = await context();
  if (!account) return { error: "Connectez d'abord votre boîte mail dans Paramètres." };
  // Les réponses d'abord : on ne relance pas quelqu'un qui vient de répondre.
  await syncReplies(account, orgId, true).catch(() => 0);
  const today = todayISO();
  const all = await db.prospect.findMany({
    where: { organizationId: orgId, status: { in: includeFirst ? ["À contacter", "Contacté", "Relancé"] : ["Contacté", "Relancé"] }, searchId: { not: null } },
    include: { search: { include: { template: true } } },
  });
  const todo = all.filter((p) => (p.status === "À contacter" ? p.email.includes("@") : isDue(p, today))).slice(0, BATCH_MAX);
  let sent = 0;
  const errors: string[] = [];
  for (const p of todo) {
    try { await sendStep(account, p, user.id, signature); sent++; } catch (e) { errors.push(message(e)); if (!(e instanceof MailError)) break; }
  }
  revalidatePath("/app", "layout");
  if (!todo.length) return { ok: "Rien à envoyer pour l'instant." };
  return { ok: `${sent} email${sent > 1 ? "s" : ""} envoyé${sent > 1 ? "s" : ""}.`, error: errors.length ? `${errors.length} non envoyé(s) : ${errors.slice(0, 3).join(" ")}` : undefined };
}
