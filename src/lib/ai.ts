import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { createHash } from "node:crypto";
import { db } from "./db";
import { decrypt } from "./mail";

// Modèle par défaut : Claude Opus 5.5. Modifiable sans toucher au code via ANTHROPIC_MODEL.
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
// Tâches simples (compte rendu d'appel, test des 5 leads) : Claude Haiku 5.5, bien moins cher ; modifiable via ANTHROPIC_MODEL_LIGHT.
export const AI_MODEL_LIGHT = process.env.ANTHROPIC_MODEL_LIGHT || "claude-haiku-5-5";

// Modèle par fonction : Haiku 5.5 pour tout ce qu'il fait bien ; Opus 5.5 garde la rédaction des séquences.
// Pour revenir à Opus sur une fonction, retirez-la de cette liste.
const LIGHT_FEATURES = new Set(["angles", "appel", "ciblage", "analyse", "assistant"]);
export const modelFor = (feature: string) => (LIGHT_FEATURES.has(feature) ? AI_MODEL_LIGHT : AI_MODEL);

// En cas de refus par les filtres de sécurité, Anthropic relance automatiquement la demande sur un modèle adapté.
export const FALLBACK = {
  betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[],
  fallbacks: "default" as const,
};
// Les modèles Haiku n'ont pas de relance côté serveur.
export const fallbackFor = (model: string) => (model.includes("haiku") ? {} : FALLBACK);

// Clé de la plateforme (variable d'environnement), utilisée quand l'entreprise n'a pas connecté la sienne.
export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY;
// IA disponible pour une entreprise : sa propre clé (Paramètres → API IA) ou celle de la plateforme.
export const aiReady = (org: { aiKeyEnc?: string | null }) => aiEnabled() || !!org.aiKeyEnc;

let client: Anthropic | null = null;
export function anthropic() {
  if (!client) client = new Anthropic();
  return client;
}

const orgClients = new Map<string, Anthropic>();
// Client de l'entreprise : sa clé Claude si elle en a une, sinon celle de la plateforme.
export async function aiClient(organizationId: string | null) {
  const org = organizationId ? await db.organization.findUnique({ where: { id: organizationId }, select: { aiKeyEnc: true } }) : null;
  if (org?.aiKeyEnc) {
    let key: string;
    try { key = decrypt(org.aiKeyEnc); } catch { throw new AiError("La clé IA enregistrée est illisible : reconnectez-la dans Paramètres → API IA."); }
    const id = createHash("sha256").update(key).digest("hex");
    if (!orgClients.has(id)) orgClients.set(id, new Anthropic({ apiKey: key }));
    return orgClients.get(id)!;
  }
  if (!aiEnabled()) throw new AiError("L'IA n'est pas connectée : ajoutez votre clé Claude dans Paramètres → API IA.");
  return anthropic();
}

export type AiContext = { organizationId: string; userId: string | null };
export type Effort = "low" | "medium" | "high";

// Erreur dont le message peut être montré tel quel à l'utilisateur.
export class AiError extends Error {}

export function aiErrorMessage(e: unknown) {
  if (e instanceof AiError) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return "La clé Claude est refusée : vérifiez-la dans Paramètres → API IA.";
  if (e instanceof Anthropic.PermissionDeniedError) return "La clé API Anthropic n'a pas accès à ce modèle.";
  if (e instanceof Anthropic.RateLimitError) return "L'IA reçoit trop de demandes : réessayez dans une minute.";
  if (e instanceof Anthropic.APIConnectionError) return "Impossible de joindre l'IA : vérifiez la connexion internet.";
  if (e instanceof Anthropic.APIError) return `Le service IA a renvoyé une erreur (${e.status ?? "inconnue"}). Réessayez.`;
  return "L'IA n'a pas pu répondre. Réessayez.";
}

export const HONESTY = `Règles strictes d'honnêteté : n'invente jamais un nom, un email, un numéro, un profil LinkedIn, un chiffre ou une actualité. Travaille uniquement à partir des données fournies. Ce que tu déduis seulement du secteur est préfixé par « (déduction) ». Si une information manque, écris « À enrichir ».`;

// Préfixe stable, identique à chaque appel : il peut être mis en cache par l'API.
export const SYSTEM_PROMPT = `Tu es un Head of Sales B2B expérimenté (prospection outbound, account-based marketing, qualification, CRM), intégré à l'outil de prospection Cockpit'ch. Tu privilégies la qualité des prospects sur le volume, la personnalisation sur l'automatisation et la valeur apportée sur le discours commercial. Pas de conseil générique : appuie-toi sur les données. Réponds en français.
${HONESTY}`;

export async function logUsage(ctx: AiContext, feature: string, usage: { input_tokens?: number | null; output_tokens?: number | null }, model = AI_MODEL) {
  await db.aiUsage
    .create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        feature,
        model,
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
      },
    })
    .catch(() => undefined);
}

// Réponse JSON validée par un schéma Zod.
export async function generateJSON<S extends z.ZodType>(ctx: AiContext, feature: string, schema: S, prompt: string, effort: Effort = "medium", model = modelFor(feature)): Promise<z.infer<S>> {
  const res = await (await aiClient(ctx.organizationId)).beta.messages.parse({
    model,
    max_tokens: 16000,
    ...fallbackFor(model),
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    output_config: { format: betaZodOutputFormat(schema), effort },
    messages: [{ role: "user", content: prompt }],
  });
  await logUsage(ctx, feature, res.usage, model);
  if (res.stop_reason === "refusal") throw new AiError("L'IA a refusé cette demande. Reformulez les informations et réessayez.");
  if (res.stop_reason === "max_tokens") throw new AiError("La réponse était trop longue : réessayez sur moins d'éléments.");
  if (!res.parsed_output) throw new AiError("La réponse de l'IA était illisible. Réessayez.");
  return res.parsed_output as z.infer<S>;
}

// Réponse en texte (Markdown), en streaming côté serveur pour éviter les délais d'attente.
export async function generateText(ctx: AiContext, feature: string, prompt: string, effort: Effort = "medium", model = modelFor(feature)) {
  const stream = (await aiClient(ctx.organizationId)).beta.messages.stream({
    model,
    max_tokens: 32000,
    ...fallbackFor(model),
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    output_config: { effort },
    messages: [{ role: "user", content: prompt }],
  });
  const msg = await stream.finalMessage();
  await logUsage(ctx, feature, msg.usage, model);
  if (msg.stop_reason === "refusal") throw new AiError("L'IA a refusé cette demande. Reformulez et réessayez.");
  return msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
}

