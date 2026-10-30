"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin, requireMember } from "@/lib/auth";
import { sendWeeklyReport } from "@/lib/weekly-report";
import { stripe, stripeEnabled } from "@/lib/billing";
import { firstError, nameField, type FormState } from "@/lib/validation";

// Nom de l'entreprise et signature proposée à toute l'équipe.
export async function saveOrganization(_: FormState, form: FormData): Promise<FormState> {
  const { membership } = await requireAdmin();
  const defaultSignature = String(form.get("defaultSignature") ?? "").trim().slice(0, 1000);
  const values = { name: String(form.get("name") ?? ""), defaultSignature };
  const parsed = nameField.safeParse(values.name);
  if (!parsed.success) return { error: firstError(parsed.error), values };
  await db.organization.update({ where: { id: membership.organizationId }, data: { name: parsed.data, defaultSignature } });
  revalidatePath("/app", "layout");
  return { ok: "Entreprise enregistrée.", values: { name: parsed.data, defaultSignature } };
}

export async function saveSignature(_: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireMember();
  const signature = String(form.get("signature") ?? "").trim().slice(0, 1000);
  await db.user.update({ where: { id: user.id }, data: { signature } });
  revalidatePath("/app", "layout");
  return { ok: "Signature enregistrée.", values: { signature } };
}

// Suppression définitive de l'entreprise et de toutes ses données (droit à l'effacement).
export async function deleteOrganization(_: FormState, form: FormData): Promise<FormState> {
  const { user, membership } = await requireAdmin();
  const org = membership.organization;
  if (String(form.get("confirm") ?? "").trim() !== org.name) return { error: `Tapez exactement « ${org.name} » pour confirmer.` };
  if (stripeEnabled() && org.stripeSubscriptionId && ["active", "trialing", "past_due"].includes(org.subscriptionStatus ?? ""))
    await stripe().subscriptions.cancel(org.stripeSubscriptionId).catch(() => null);
  // Utilisateurs rattachés à cette seule entreprise : leur compte disparaît avec elle (sauf super admin).
  const members = await db.membership.findMany({ where: { organizationId: org.id }, select: { userId: true, user: { select: { isSuperAdmin: true, _count: { select: { memberships: true } } } } } });
  const orphans = members.filter((m) => m.user._count.memberships === 1 && !m.user.isSuperAdmin).map((m) => m.userId);
  await db.$transaction([
    db.phoneEvent.deleteMany({ where: { organizationId: org.id } }),
    db.aiUsage.deleteMany({ where: { organizationId: org.id } }),
    db.session.updateMany({ where: { organizationId: org.id }, data: { organizationId: null } }),
    db.organization.delete({ where: { id: org.id } }),
    db.user.deleteMany({ where: { id: { in: orphans } } }),
  ]);
  redirect(orphans.includes(user.id) ? "/connexion?erreur=supprime" : user.isSuperAdmin ? "/super-admin" : "/connexion?erreur=supprime");
}

// Opt-in de l'envoi automatique des relances.
export async function setAutoSend(on: boolean) {
  const { user } = await requireMember();
  await db.user.update({ where: { id: user.id }, data: { autoSend: on } });
  revalidatePath("/app/parametres");
}

export async function sendReportNow(): Promise<{ ok?: string; error?: string }> {
  const { user, membership } = await requireAdmin();
  const sent = await sendWeeklyReport(membership.organizationId, { force: true, onlyUserId: user.id });
  return sent ? { ok: `Rapport envoyé à ${user.email}.` } : { error: "Envoi impossible : les emails de la plateforme (Resend) ne sont pas encore configurés. Le rapport reste consultable ci-dessous." };
}

export async function hideOnboarding() {
  const { user } = await requireMember();
  await db.user.update({ where: { id: user.id }, data: { onboardingHidden: true } });
  revalidatePath("/app");
}
