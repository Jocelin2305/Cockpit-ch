import { db } from "@/lib/db";
import { apolloWebhookOrg } from "@/lib/apollo";
import { CREDIT_COSTS, CREDIT_LABELS } from "@/lib/credit-grid";
import { spendCredits } from "@/lib/credits";

type Phone = { sanitized_number?: string; raw_number?: string };
type Person = { id?: string; phone_numbers?: Phone[] };

// Téléphones directs livrés par Apollo après un enrichissement : rangés sur la fiche du contact (identifiant Apollo).
// Seul un numéro nouveau est débité : un second envoi du même numéro ne coûte rien.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const orgId = apolloWebhookOrg((await params).token);
  if (!orgId) return new Response("Non autorisé", { status: 401 });
  const org = await db.organization.findUnique({ where: { id: orgId }, select: { id: true, resellerId: true } });
  if (!org) return new Response("Entreprise inconnue", { status: 404 });
  const body = await request.json().catch(() => null);
  const people: Person[] = Array.isArray(body?.people) ? body.people : Array.isArray(body?.matches) ? body.matches : body?.person ? [body.person] : body?.id ? [body] : [];
  let updated = 0;
  for (const person of people) {
    const phone = person.phone_numbers?.map((n) => n.sanitized_number || n.raw_number).find(Boolean);
    if (!person.id || !phone) continue;
    const list = await db.prospect.findMany({ where: { organizationId: orgId, apolloId: person.id }, select: { id: true, phone: true } });
    for (const p of list) {
      if (p.phone === phone) continue;
      await db.prospect.update({ where: { id: p.id }, data: { phone } });
      await spendCredits(org, CREDIT_COSTS.phone, CREDIT_LABELS.phone, { force: true });
      updated++;
    }
  }
  return Response.json({ updated });
}
