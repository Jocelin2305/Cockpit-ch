import { db } from "@/lib/db";
import { cronAllowed } from "@/lib/cron";
import { sendWeeklyReport } from "@/lib/weekly-report";

export const maxDuration = 300;

// Chaque lundi matin : rapport hebdomadaire aux administrateurs de chaque entreprise.
export async function GET(request: Request) {
  if (!cronAllowed(request)) return new Response("Non autorisé", { status: 401 });
  const orgs = await db.organization.findMany({ where: { isDemo: false, memberships: { some: { role: "ADMIN", user: { weeklyReport: true } } } }, select: { id: true } });
  let sent = 0;
  for (const o of orgs) sent += await sendWeeklyReport(o.id).catch(() => 0);
  return Response.json({ organizations: orgs.length, sent });
}
