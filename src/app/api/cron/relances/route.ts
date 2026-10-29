import { db } from "@/lib/db";
import { cronAllowed } from "@/lib/cron";
import { sendDue } from "@/lib/mail-flow";

export const maxDuration = 300;

// Chaque matin de semaine : relances dues envoyées depuis la boîte des utilisateurs qui ont activé l'envoi automatique.
export async function GET(request: Request) {
  if (!cronAllowed(request)) return new Response("Non autorisé", { status: 401 });
  const accounts = await db.mailAccount.findMany({ where: { user: { autoSend: true } }, include: { user: { select: { name: true, signature: true, memberships: { select: { organizationId: true, organization: { select: { isDemo: true } } } } } } } });
  let sent = 0;
  for (const a of accounts) {
    for (const m of a.user.memberships) {
      if (m.organization.isDemo) continue;
      const r = await sendDue(a, m.organizationId, a.user.signature || a.user.name, { includeFirst: false, ownOnly: true }).catch(() => ({ sent: 0 }));
      sent += r.sent;
    }
  }
  return Response.json({ accounts: accounts.length, sent });
}
