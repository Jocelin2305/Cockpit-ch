import { headers } from "next/headers";
import { z } from "zod";
import { AI_MODEL_LIGHT, aiEnabled, anthropic, fallbackFor } from "@/lib/ai";

export const maxDuration = 120;

// Test public « 5 leads » de la page d'accueil : 3 analyses par jour et par adresse IP.
const LIMIT = 3;
const seen = new Map<string, { day: string; n: number }>();

const input = z.object({
  offer: z.string().trim().min(5).max(1200),
  leads: z.array(z.object({ entreprise: z.string().trim().min(1).max(120), infos: z.string().trim().max(400).default("") })).min(1).max(5),
});

export function GET() {
  return Response.json({ enabled: aiEnabled() });
}

export async function POST(request: Request) {
  if (!aiEnabled()) return Response.json({ code: "not_granted" }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "invalid_json" }, { status: 400 });
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const day = new Date().toISOString().slice(0, 10);
  const used = seen.get(ip);
  const n = used?.day === day ? used.n : 0;
  if (n >= LIMIT) return Response.json({ code: "rate_limited" }, { status: 429 });
  seen.set(ip, { day, n: n + 1 });

  const { offer, leads } = parsed.data;
  const prompt =
    "Tu es un expert en prospection B2B francophone. Analyse chaque prospect au regard de l'offre du vendeur.\n\n" +
    `OFFRE DU VENDEUR :\n${offer}\n\n` +
    `PROSPECTS :\n${leads.map((l, i) => `${i + 1}. ${l.entreprise} : ${l.infos || "aucune information"}`).join("\n")}\n\n` +
    "Règles : tu ne peux pas consulter internet ; base-toi seulement sur les informations fournies et sur ta connaissance générale du secteur, sans inventer de faits précis sur l'entreprise. " +
    "Le score (0-100) mesure l'adéquation avec l'offre et la présence de signaux d'achat. priorite vaut 'chaud' (score >= 70), 'tiède' (40-69) ou 'froid' (< 40). " +
    "L'email fait 60 à 90 mots, en vouvoiement, sans formule creuse, avec une seule question finale. Si le lead est froid, email_objet vaut '—' et email_corps explique en une phrase pourquoi ne pas l'écrire maintenant.\n\n" +
    "Réponds uniquement par un tableau JSON, un objet par prospect, au format : " +
    '[{"entreprise":"…","score":0,"priorite":"chaud","angle":"une phrase","signaux":["…","…"],"decideur":"…","email_objet":"…","email_corps":"…"}]';
  try {
    const msg = await anthropic().beta.messages.create({
      model: AI_MODEL_LIGHT,
      max_tokens: 8000,
      ...fallbackFor(AI_MODEL_LIGHT),
      output_config: { effort: "low" },
      messages: [{ role: "user", content: prompt }],
    });
    if (msg.stop_reason === "refusal") return Response.json({ code: "refused" }, { status: 422 });
    const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const json = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
    const data = JSON.parse(json);
    if (!Array.isArray(data) || !data.length) return Response.json({ code: "empty_completion" }, { status: 502 });
    return Response.json({ data });
  } catch (e) {
    if (e instanceof SyntaxError) return Response.json({ code: "invalid_json" }, { status: 502 });
    return Response.json({ code: "upstream_error" }, { status: 502 });
  }
}
