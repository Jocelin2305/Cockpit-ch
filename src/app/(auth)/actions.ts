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

// Protection contre les essais de mots de passe en série.
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? ""));

  const since = new Date(Date.now() - LOCK_MINUTES * 60_000);
  if ((await db.loginAttempt.count({ where: { email, at: { gte: since } } })) >= MAX_FAILS)
    return { error: `Trop de tentatives. Réessayez dans ${LOCK_MINUTES} minutes.`, values: { email } };

  const user = await db.user.findUnique({
    where: { email },
    include: { memberships: { orderBy: { createdAt: "asc" } } },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await db.loginAttempt.create({ data: { email } });
    return { error: "Email ou mot de passe incorrect.", values: { email } };
  }
  await db.loginAttempt.deleteMany({ where: { OR: [{ email }, { at: { lt: since } }] } });

  // Le fondateur est toujours super admin ; les autres gardent le droit que le fondateur leur a accordé.
  const isSuperAdmin = user.isSuperAdmin || isSuperAdminEmail(email);
  // briefingDay remis à zéro : le point du jour s'affiche à chaque connexion.
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), isSuperAdmin, briefingDay: null } });
  await createSession(user.id, user.memberships[0]?.organizationId ?? null);
  redirect(next || (user.memberships.length ? "/app" : isSuperAdmin ? "/super-admin" : "/connexion?erreur=sans-entreprise"));
}

export async function logout() {
  await destroySession();
  redirect("/connexion");
}
