import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { db } from "./db";

// Modèle par défaut : Claude Opus 5.5. Modifiable sans toucher au code via ANTHROPIC_MODEL.
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

// En cas de refus par les filtres de sécurité, Anthropic relance automatiquement la demande sur un modèle adapté.
export const FALLBACK = {
  betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[],
  fallbacks: "default" as const,
};

export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
export function anthropic() {
  if (!client) client = new Anthropic();
  return client;
}

export type AiContext = { organizationId: string; userId: string };
export type Effort = "low" | "medium" | "high";

// Erreur dont le message peut être montré tel quel à l'utilisateur.
export class AiError extends Error {}

export function aiErrorMessage(e: unknown) {
  if (e instanceof AiError) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return "La clé API Anthropic est refusée : vérifiez ANTHROPIC_API_KEY dans le fichier .env.";
  if (e instanceof Anthropic.PermissionDeniedError) return "La clé API Anthropic n'a pas accès à ce modèle.";
  if (e instanceof Anthropic.RateLimitError) return "L'IA reçoit trop de demandes : réessayez dans une minute.";
  if (e instanceof Anthropic.APIConnectionError) return "Impossible de joindre l'IA : vérifiez la connexion internet.";
  if (e instanceof Anthropic.APIError) return `Le service IA a renvoyé une erreur (${e.status ?? "inconnue"}). Réessayez.`;
  return "L'IA n'a pas pu répondre. Réessayez.";
}

export const HONESTY = `Règles strictes d'honnêteté : n'invente jamais un nom, un email, un numéro, un profil LinkedIn, un chiffre ou une actualité. Travaille uniquement à partir des données fournies. Ce que tu déduis seulement du secteur est préfixé par « (déduction) ». Si une information manque, écris « À enrichir ».`;

// Préfixe stable, identique à chaque appel : il peut être mis en cache par l'API.
export const SYSTEM_PROMPT = `Tu es un Head of Sales B2B expérimenté (prospection outbound, account-based marketing, qualification, CRM), intégré à l'outil Cockpit Prospection. Tu privilégies la qualité des prospects sur le volume, la personnalisation sur l'automatisation et la valeur apportée sur le discours commercial. Pas de conseil générique : appuie-toi sur les données. Réponds en français.
${HONESTY}`;

export async function logUsage(ctx: AiContext, feature: string, usage: { input_tokens?: number | null; output_tokens?: number | null }) {
  await db.aiUsage
    .create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        feature,
        model: AI_MODEL,
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
      },
    })
    .catch(() => undefined);
}

function requireAi() {
  if (!aiEnabled()) throw new AiError("L'IA n'est pas encore configurée : ajoutez votre clé ANTHROPIC_API_KEY dans le fichier .env, puis relancez l'application.");
}

// Réponse JSON validée par un schéma Zod.
export async function generateJSON<S extends z.ZodType>(ctx: AiContext, feature: string, schema: S, prompt: string, effort: Effort = "medium"): Promise<z.infer<S>> {
  requireAi();
  const res = await anthropic().beta.messages.parse({
    model: AI_MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    output_config: { format: betaZodOutputFormat(schema), effort },
    messages: [{ role: "user", content: prompt }],
  });
  await logUsage(ctx, feature, res.usage);
  if (res.stop_reason === "refusal") throw new AiError("L'IA a refusé cette demande. Reformulez les informations et réessayez.");
  if (res.stop_reason === "max_tokens") throw new AiError("La réponse était trop longue : réessayez sur moins d'éléments.");
  if (!res.parsed_output) throw new AiError("La réponse de l'IA était illisible. Réessayez.");
  return res.parsed_output as z.infer<S>;
}

// Réponse en texte (Markdown), en streaming côté serveur pour éviter les délais d'attente.
export async function generateText(ctx: AiContext, feature: string, prompt: string, effort: Effort = "medium") {
  requireAi();
  const stream = anthropic().beta.messages.stream({
    model: AI_MODEL,
    max_tokens: 32000,
    ...FALLBACK,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    output_config: { effort },
    messages: [{ role: "user", content: prompt }],
  });
  const msg = await stream.finalMessage();
  await logUsage(ctx, feature, msg.usage);
  if (msg.stop_reason === "refusal") throw new AiError("L'IA a refusé cette demande. Reformulez et réessayez.");
  return msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
}
