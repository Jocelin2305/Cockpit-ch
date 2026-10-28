import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";

const COOKIE = "cp_session";
const SESSION_DAYS = 30;

export const ROLES = { ADMIN: "ADMIN", MEMBER: "MEMBER" } as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];
export const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrateur", MEMBER: "Commercial" };

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export function isSuperAdminEmail(email: string) {
  return (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

// N'accepte qu'un chemin interne, pour éviter les redirections vers un autre site.
export const safeNext = (next: string) => (next.startsWith("/") && !next.startsWith("//") ? next : "");

// À appeler uniquement depuis une action serveur : elle écrit le cookie.
export async function createSession(userId: string, organizationId: string | null) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, organizationId, expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(COOKIE);
}

export const getSession = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  const membership = session.organizationId
    ? await db.membership.findUnique({
        where: { userId_organizationId: { userId: session.userId, organizationId: session.organizationId } },
        include: { organization: true },
      })
    : null;
  return { sessionId: session.id, user: session.user, membership };
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  return session;
}

export async function requireMember() {
  const session = await requireUser();
  if (!session.membership) redirect(session.user.isSuperAdmin ? "/super-admin" : "/connexion?erreur=sans-entreprise");
  return { ...session, membership: session.membership };
}

export async function requireAdmin() {
  const session = await requireMember();
  if (session.membership.role !== ROLES.ADMIN) redirect("/app");
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireUser();
  if (!session.user.isSuperAdmin) redirect("/app");
  return session;
}
