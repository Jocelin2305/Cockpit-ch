import { db } from "./db";
import { hashToken } from "./auth";

// Renvoie l'invitation si le lien est encore valable (non utilisé, non expiré).
export async function findInvitation(token: string) {
  const invitation = await db.invitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { organization: true } });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) return null;
  return invitation;
}
