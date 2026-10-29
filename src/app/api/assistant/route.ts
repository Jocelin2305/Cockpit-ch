import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getSession, ROLE_LABEL } from "@/lib/auth";
import { AI_MODEL, FALLBACK, SYSTEM_PROMPT, aiClient, aiErrorMessage, aiReady, logUsage } from "@/lib/ai";
import { ASSISTANT_RULES, assistantContext, assistantTools } from "@/lib/assistant";

export const maxDuration = 300;

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
    .min(1)
    .max(30),
});

// Réponse en lignes JSON : {type:"text",delta} | {type:"action",label} | {type:"error",message} | {type:"done"}.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.membership) return new Response("Non autorisé", { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") return new Response("Requête invalide", { status: 400 });

  const { user, membership } = session;
  const ctx = { organizationId: membership.organizationId, userId: user.id, signature: user.signature || user.name };
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: Record<string, unknown>) => controller.enqueue(encoder.encode(`${JSON.stringify(o)}\n`));
      const usage = { input_tokens: 0, output_tokens: 0 };
      try {
        if (!aiReady(membership.organization)) {
          send({ type: "error", message: "L'IA n'est pas connectée : ajoutez votre clé Claude dans Paramètres → API IA." });
          return;
        }
        const client = await aiClient(membership.organizationId);
        const context = await assistantContext(ctx, membership.organization.name, user.name, ROLE_LABEL[membership.role]);
        // Seuls les 12 derniers échanges repartent à l'IA (les plus anciens coûtaient sans servir).
        const recent = parsed.data.messages.slice(-12);
        while (recent[0]?.role !== "user") recent.shift();
        const messages: Anthropic.Beta.BetaMessageParam[] = recent.map((m, i) => ({ role: m.role, content: m.role === "assistant" && i < recent.length - 2 ? m.content.slice(0, 2000) : m.content }));
        const runner = client.beta.messages.toolRunner(
          {
            model: AI_MODEL,
            max_tokens: 16000,
            stream: true,
            max_iterations: 10,
            ...FALLBACK,
            system: [
              { type: "text", text: SYSTEM_PROMPT + ASSISTANT_RULES, cache_control: { type: "ephemeral" } },
              { type: "text", text: context },
            ],
            output_config: { effort: "low" },
            tools: assistantTools(ctx, (label) => send({ type: "action", label })),
            messages,
          },
          { signal: request.signal },
        );
        let wroteText = false;
        for await (const turn of runner) {
          let first = true;
          turn.on("text", (delta) => {
            if (first && wroteText) send({ type: "text", delta: "\n\n" });
            first = false;
            wroteText = true;
            send({ type: "text", delta });
          });
          const message = await turn.finalMessage();
          usage.input_tokens += message.usage.input_tokens ?? 0;
          usage.output_tokens += message.usage.output_tokens ?? 0;
          if (message.stop_reason === "refusal") send({ type: "error", message: "L'IA a refusé cette demande. Reformulez-la." });
        }
        send({ type: "done" });
      } catch (e) {
        if (!request.signal.aborted) send({ type: "error", message: aiErrorMessage(e) });
      } finally {
        if (usage.input_tokens || usage.output_tokens) await logUsage(ctx, "assistant", usage);
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
