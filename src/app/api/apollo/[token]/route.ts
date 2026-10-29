import { db } from "@/lib/db";
import { apolloWebhookOrg } from "@/lib/apollo";

type Phone = { sanitized_number?: string; raw_number?: string };
type Person = { id?: string; phone_numbers?: Phone[] };

// Téléphones directs livrés par Apollo après un enrichissement : rangés sur la fiche du contact (identifiant Apollo).
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const orgId = apolloWebhookOrg((await params).token);
  if (!orgId) return new Response("Non autorisé", { status: 401 });
  const body = await request.json().catch(() => null);
  const people: Person[] = Array.isArray(body?.people) ? body.people : Array.isArray(body?.matches) ? body.matches : body?.person ? [body.person] : body?.id ? [body] : [];
  let updated = 0;
  for (const person of people) {
    const phone = person.phone_numbers?.map((n) => n.sanitized_number || n.raw_number).find(Boolean);
    if (!person.id || !phone) continue;
    const list = await db.prospect.findMany({ where: { organizationId: orgId, apolloId: person.id }, select: { id: true } });
    for (const p of list) {
      await db.prospect.update({ where: { id: p.id }, data: { phone } });
      updated++;
    }
  }
  return Response.json({ updated });
}
