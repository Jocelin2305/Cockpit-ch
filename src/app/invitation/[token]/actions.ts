"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, getSession, hashPassword, isSuperAdminEmail } from "@/lib/auth";
import { findInvitation } from "@/lib/invitations";
import { firstError, nameField, passwordField, type FormState } from "@/lib/validation";
import { z } from "zod";

const newUserSchema = z.object({ name: nameField, password: passwordField });

export async function acceptAsNewUser(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const invitation = await findInvitation(token);
  if (!invitation) return { error: "Cette invitation n'est plus valable. Demandez-en une nouvelle." };
  const values = { name: String(form.get("name") ?? "") };
  const parsed = newUserSchema.safeParse({ ...values, password: form.get("password") });
  if (!parsed.success) return { error: firstError(parsed.error), values };
  if (form.get("terms") !== "on") return { error: "Acceptez les conditions d'utilisation pour continuer.", values };

  if (await db.user.findUnique({ where: { email: invitation.email } }))
    return { error: "Un compte existe déjà avec cet email : connectez-vous pour rejoindre l'équipe.", values };

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: invitation.email,
      passwordHash: await hashPassword(parsed.data.password),
      isSuperAdmin: isSuperAdminEmail(invitation.email),
      termsAcceptedAt: new Date(),
      lastLoginAt: new Date(),
      memberships: { create: { role: invitation.role, organizationId: invitation.organizationId } },
    },
  });
  await db.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
  await createSession(user.id, invitation.organizationId);
  redirect("/app");
}

export async function acceptAsCurrentUser(form: FormData) {
  const token = String(form.get("token") ?? "");
  const invitation = await findInvitation(token);
  const session = await getSession();
  if (!invitation || !session || session.user.email !== invitation.email) redirect(`/invitation/${token}`);

  await db.membership.upsert({
    where: { userId_organizationId: { userId: session.user.id, organizationId: invitation.organizationId } },
    update: {},
    create: { userId: session.user.id, organizationId: invitation.organizationId, role: invitation.role },
  });
  await db.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
  await db.session.update({ where: { id: session.sessionId }, data: { organizationId: invitation.organizationId } });
  redirect("/app");
}
