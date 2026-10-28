"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { appUrl, hashToken, isSuperAdminEmail, newToken, requireSuperAdmin, requireUser, ROLES } from "@/lib/auth";
import { TRIAL_DAYS } from "@/lib/plans";
import { firstError, nameField, type FormState } from "@/lib/validation";

const INVITE_DAYS = 14;

// Ouvre l'espace d'un client pour le paramétrer (recherches, séquences, prospects, équipe).
export async function enterOrganization(form: FormData) {
  const { sessionId } = await requireSuperAdmin();
  const org = await db.organization.findUnique({ where: { id: String(form.get("id")) }, select: { id: true } });
  if (!org) redirect("/super-admin");
  await db.session.update({ where: { id: sessionId }, data: { organizationId: org.id } });
  redirect("/app/tableau-de-bord");
}

export async function leaveOrganization() {
  const { sessionId, user } = await requireUser();
  const own = await db.membership.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  await db.session.update({ where: { id: sessionId }, data: { organizationId: own?.organizationId ?? null } });
  redirect("/super-admin");
}

const clientSchema = z.object({ company: nameField, email: z.string().trim().toLowerCase().email("Email de l'administrateur invalide.") });

// Crée le compte d'un client (essai gratuit) et l'invitation de son administrateur.
export async function createClient(_: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireSuperAdmin();
  const values = { company: String(form.get("company") ?? ""), email: String(form.get("email") ?? "") };
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) return { error: firstError(parsed.error), values };
  const token = newToken();
  const org = await db.organization.create({
    data: {
      name: parsed.data.company,
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
      invitations: {
        create: { email: parsed.data.email, role: ROLES.ADMIN, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000), invitedById: user.id },
      },
    },
  });
  revalidatePath("/super-admin");
  return {
    ok: `${org.name} est créé. Paramétrez son espace, puis envoyez ce lien à ${parsed.data.email} (valable ${INVITE_DAYS} jours).`,
    link: `${appUrl()}/invitation/${token}`,
    values: { orgId: org.id },
  };
}

// Seul le fondateur accorde ou retire l'accès super admin ; un fondateur ne peut pas le perdre.
export async function setSuperAdmin(form: FormData) {
  const { user } = await requireSuperAdmin();
  if (!user.isFounder) redirect("/super-admin");
  const target = await db.user.findUnique({ where: { id: String(form.get("id")) } });
  if (!target || isSuperAdminEmail(target.email)) redirect("/super-admin");
  const on = form.get("on") === "1";
  await db.user.update({ where: { id: target.id }, data: { isSuperAdmin: on } });
  // Retrait immédiat : la personne est déconnectée partout.
  if (!on) await db.session.deleteMany({ where: { userId: target.id } });
  revalidatePath("/super-admin");
}
