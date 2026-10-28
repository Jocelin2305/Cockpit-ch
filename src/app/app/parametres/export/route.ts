import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Export RGPD : toutes les données de l'entreprise, en un fichier JSON (droit à la portabilité).
export async function GET() {
  const { membership } = await requireAdmin();
  const organizationId = membership.organizationId;
  const where = { organizationId };
  const [organization, members, searches, templates, prospects, calls, mails, phoneEvents] = await Promise.all([
    db.organization.findUnique({ where: { id: organizationId }, select: { name: true, plan: true, createdAt: true, trialEndsAt: true, subscriptionStatus: true, currentPeriodEnd: true } }),
    db.membership.findMany({ where, select: { role: true, createdAt: true, user: { select: { name: true, email: true, signature: true, lastLoginAt: true } } } }),
    db.search.findMany({ where }),
    db.sequenceTemplate.findMany({ where }),
    db.prospect.findMany({ where }),
    db.call.findMany({ where }),
    db.mailMessage.findMany({ where }),
    db.phoneEvent.findMany({ where }),
  ]);
  const data = { exportedAt: new Date().toISOString(), organization, members, searches, templates, prospects, calls, mails, phoneEvents };
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="cockpitch-export-${day}.json"` },
  });
}
