"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { encrypt } from "@/lib/mail";
import type { FormState } from "@/lib/validation";

// Clé Claude de l'entreprise : vérifiée par un appel gratuit (liste des modèles), puis enregistrée chiffrée.
export async function connectAiKey(_: FormState, form: FormData): Promise<FormState> {
  const { membership } = await requireAdmin();
  const key = String(form.get("key") ?? "").trim();
  if (!/^sk-ant-/.test(key)) return { error: "Collez une clé API Claude (elle commence par sk-ant-)." };
  try {
    await new Anthropic({ apiKey: key, maxRetries: 0 }).models.list({ limit: 1 });
  } catch (e) {
    return { error: e instanceof Anthropic.AuthenticationError ? "Claude refuse cette clé : vérifiez-la sur console.anthropic.com." : "Vérification impossible pour le moment : réessayez dans un instant." };
  }
  await db.organization.update({ where: { id: membership.organizationId }, data: { aiProvider: "claude", aiKeyEnc: encrypt(key) } });
  revalidatePath("/app", "layout");
  return { ok: "Clé Claude connectée." };
}

export async function disconnectAiKey() {
  const { membership } = await requireAdmin();
  await db.organization.update({ where: { id: membership.organizationId }, data: { aiProvider: null, aiKeyEnc: null } });
  revalidatePath("/app", "layout");
}
