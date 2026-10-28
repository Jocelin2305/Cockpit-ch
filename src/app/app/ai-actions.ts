"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireMember } from "@/lib/auth";
import { aiErrorMessage } from "@/lib/ai";
import { analyzeSearch, generateAnglesFor, generateTemplateSteps } from "@/lib/ai-features";
import { db } from "@/lib/db";
import { tplDelays, tplLiDelays } from "@/lib/prospecting";

export async function generateAngles(scope: { prospectId?: string; searchId?: string }) {
  const { user, membership } = await requireMember();
  try {
    const res = await generateAnglesFor({ organizationId: membership.organizationId, userId: user.id }, scope);
    revalidatePath("/app", "layout");
    return { ok: res.count ? `${res.count} angle${res.count > 1 ? "s" : ""} commercia${res.count > 1 ? "ux" : "l"} rédigé${res.count > 1 ? "s" : ""}.` : "Aucun angle manquant." };
  } catch (e) {
    return { error: aiErrorMessage(e) };
  }
}

export async function draftTemplate(templateId: string, delays: number[], liDelays: number[]) {
  const { user, membership } = await requireAdmin();
  const orgId = membership.organizationId;
  const template = await db.sequenceTemplate.findFirst({ where: { id: templateId, organizationId: orgId }, include: { searches: { take: 1 } } });
  if (!template) return { error: "Séquence introuvable." };
  try {
    const steps = await generateTemplateSteps({ organizationId: orgId, userId: user.id }, template.searches[0] ?? null, tplDelays(delays), tplLiDelays(liDelays));
    return { steps };
  } catch (e) {
    return { error: aiErrorMessage(e) };
  }
}

export async function runSearchAnalysis(searchId: string, kind: "analyse" | "ciblage") {
  const { user, membership } = await requireMember();
  try {
    return { text: await analyzeSearch({ organizationId: membership.organizationId, userId: user.id }, searchId, kind) };
  } catch (e) {
    return { error: aiErrorMessage(e) };
  }
}
