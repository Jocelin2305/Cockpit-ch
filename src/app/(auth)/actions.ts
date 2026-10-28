"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  isSuperAdminEmail,
  ROLES,
  safeNext,
  verifyPassword,
} from "@/lib/auth";
import { firstError, signupSchema, type FormState } from "@/lib/validation";
import { TRIAL_DAYS } from "@/lib/plans";

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const values = {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    company: String(form.get("company") ?? ""),
  };
  const parsed = signupSchema.safeParse({ ...values, password: form.get("password") });
  if (!parsed.success) return { error: firstError(parsed.error), values };
  const { name, email, company, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } }))
    return { error: "Un compte existe déjà avec cet email. Connectez-vous.", values };

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      isSuperAdmin: isSuperAdminEmail(email),
      lastLoginAt: new Date(),
      memberships: {
        create: { role: ROLES.ADMIN, organization: { create: { name: company, trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000) } } },
      },
    },
    include: { memberships: true },
  });
  await createSession(user.id, user.memberships[0].organizationId);
  redirect("/app");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? ""));

  const user = await db.user.findUnique({
    where: { email },
    include: { memberships: { orderBy: { createdAt: "asc" } } },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash)))
    return { error: "Email ou mot de passe incorrect.", values: { email } };

  const isSuperAdmin = isSuperAdminEmail(email);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), isSuperAdmin } });
  await createSession(user.id, user.memberships[0]?.organizationId ?? null);
  redirect(next || (user.memberships.length ? "/app" : isSuperAdmin ? "/super-admin" : "/connexion?erreur=sans-entreprise"));
}

export async function logout() {
  await destroySession();
  redirect("/connexion");
}
