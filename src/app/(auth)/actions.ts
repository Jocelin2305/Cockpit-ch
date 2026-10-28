"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  appUrl,
  createSession,
  destroySession,
  hashPassword,
  hashToken,
  isSuperAdminEmail,
  newToken,
  ROLES,
  safeNext,
  verifyPassword,
} from "@/lib/auth";
import { firstError, passwordField, signupSchema, type FormState } from "@/lib/validation";
import { resetEmail, sendPlatformEmail } from "@/lib/email";
import { TRIAL_DAYS } from "@/lib/plans";

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const values = {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    company: String(form.get("company") ?? ""),
  };
  const parsed = signupSchema.safeParse({ ...values, password: form.get("password") });
  if (form.get("terms") !== "on") return { error: "Acceptez les conditions d'utilisation pour continuer.", values };
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
      termsAcceptedAt: new Date(),
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

const RESET_MINUTES = 60;
const RESET_PER_HOUR = 3;

// Demande de réinitialisation : même réponse que l'email existe ou non (on ne révèle pas les comptes).
export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const ok = { ok: "Si un compte existe avec cet email, un lien de réinitialisation vient d'y être envoyé (valable 1 heure).", values: { email } };
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  if (!user) return ok;
  const recent = await db.passwordReset.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (recent >= RESET_PER_HOUR) return ok;
  const token = newToken();
  await db.passwordReset.create({ data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) } });
  const mail = resetEmail(`${appUrl()}/reinitialiser/${token}`, RESET_MINUTES);
  const sent = await sendPlatformEmail(email, mail.subject, mail.text);
  if (!sent && process.env.NODE_ENV === "production")
    return { error: "L'envoi d'emails n'est pas encore activé. Écrivez au support pour récupérer votre accès.", values: { email } };
  return ok;
}

async function findReset(token: string) {
  const reset = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  return reset && !reset.usedAt && reset.expiresAt > new Date() ? reset : null;
}

// Nouveau mot de passe : toutes les sessions ouvertes sont fermées, puis on se reconnecte.
export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const reset = await findReset(token);
  if (!reset) return { error: "Ce lien n'est plus valable. Refaites une demande." };
  const parsed = passwordField.safeParse(form.get("password"));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const user = await db.user.update({ where: { id: reset.userId }, data: { passwordHash: await hashPassword(parsed.data) } });
  await db.$transaction([
    db.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.loginAttempt.deleteMany({ where: { email: user.email } }),
  ]);
  redirect("/connexion?erreur=reinitialise");
}
