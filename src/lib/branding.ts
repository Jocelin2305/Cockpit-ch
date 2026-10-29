// Marque affichée à un client : celle de son revendeur (marque blanche), sinon Cockpit'ch.
import { db } from "./db";
import { EDITOR } from "./legal";

// Email du support : celui du revendeur pour ses clients, celui de Cockpit'ch pour les clients directs.
export async function supportEmail(org: { resellerId: string | null }) {
  if (!org.resellerId) return EDITOR.email;
  const r = await db.reseller.findUnique({ where: { id: org.resellerId }, select: { managerEmail: true, email: true } });
  return r?.managerEmail || r?.email || EDITOR.email;
}
