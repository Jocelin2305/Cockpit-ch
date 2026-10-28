import { after } from "next/server";
import { db } from "@/lib/db";
import { handlePhoneEvent, isPhoneProvider, normalize } from "@/lib/telephony";

// Webhook de la téléphonie de l'entreprise. Le jeton secret de l'adresse identifie l'entreprise.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const org = await db.organization.findUnique({ where: { phoneWebhookToken: token }, select: { id: true, phoneProvider: true } });
  if (!org?.phoneProvider || !isPhoneProvider(org.phoneProvider)) return new Response("Inconnu", { status: 404 });
  const body = await request.json().catch(() => null);
  if (!body) return new Response("JSON attendu", { status: 400 });
  const ev = normalize(org.phoneProvider, body);
  // Réponse immédiate à l'opérateur ; l'analyse IA éventuelle se fait ensuite.
  after(() => handlePhoneEvent(org.id, ev).catch((e) => console.error("Téléphonie :", e)));
  return Response.json({ ok: true });
}
