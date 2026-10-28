"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { appUrl, hashToken, newToken, requireAdmin, ROLES } from "@/lib/auth";
import { firstError, inviteSchema, type FormState } from "@/lib/validation";

const INVITE_DAYS = 7;

export async function inviteMember(_: FormState, form: FormData): Promise<FormState> {
  const { user, membership } = await requireAdmin();
  const orgId = membership.organizationId;
  const values = { email: String(form.get("email") ?? ""), role: String(form.get("role") ?? "MEMBER") };
  const parsed = inviteSchema.safeParse(values);
  if (!parsed.success) return { error: firstError(parsed.error), values };
  const { email, role } = parsed.data;

  const already = await db.membership.findFirst({ where: { organizationId: orgId, user: { email } } });
  if (already) return { error: "Cette personne fait déjà partie de l'équipe.", values };

  // Une seule invitation en attente par email : la nouvelle remplace l'ancienne.
  await db.invitation.deleteMany({ where: { organizationId: orgId, email, acceptedAt: null } });
  const token = newToken();
  await db.invitation.create({
    data: {
      email,
      role,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
      organizationId: orgId,
      invitedById: user.id,
    },
  });
  revalidatePath("/app/equipe");
  return {
    ok: `Invitation créée pour ${email}. Envoyez-lui ce lien : il est valable ${INVITE_DAYS} jours.`,
    link: `${appUrl()}/invitation/${token}`,
  };
}

export async function revokeInvitation(form: FormData) {
  const { membership } = await requireAdmin();
  await db.invitation.deleteMany({ where: { id: String(form.get("id")), organizationId: membership.organizationId } });
  revalidatePath("/app/equipe");
}

async function adminCount(orgId: string) {
  return db.membership.count({ where: { organizationId: orgId, role: ROLES.ADMIN } });
}

export async function changeRole(form: FormData) {
  const { membership } = await requireAdmin();
  const orgId = membership.organizationId;
  const role = String(form.get("role"));
  if (role !== ROLES.ADMIN && role !== ROLES.MEMBER) return;
  const target = await db.membership.findFirst({ where: { id: String(form.get("id")), organizationId: orgId } });
  if (!target || target.role === role) return;
  if (target.role === ROLES.ADMIN && (await adminCount(orgId)) <= 1) redirect("/app/equipe?erreur=dernier-admin");
  await db.membership.update({ where: { id: target.id }, data: { role } });
  revalidatePath("/app/equipe");
}

export async function removeMember(form: FormData) {
  const { membership } = await requireAdmin();
  const orgId = membership.organizationId;
  const target = await db.membership.findFirst({ where: { id: String(form.get("id")), organizationId: orgId } });
  if (!target) return;
  if (target.role === ROLES.ADMIN && (await adminCount(orgId)) <= 1) redirect("/app/equipe?erreur=dernier-admin");
  await db.membership.delete({ where: { id: target.id } });
  // La personne retirée perd l'accès immédiatement.
  await db.session.updateMany({ where: { userId: target.userId, organizationId: orgId }, data: { organizationId: null } });
  revalidatePath("/app/equipe");
}
