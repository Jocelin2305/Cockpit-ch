"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireMember } from "@/lib/auth";
import { CrmError, encryptCrmToken, isCrmProvider, syncToCrm, testCrm } from "@/lib/crm";
import type { FormState } from "@/lib/validation";

// Connexion du CRM : le jeton est vérifié auprès du CRM, puis enregistré chiffré.
export async function connectCrm(_: FormState, form: FormData): Promise<FormState> {
  const { membership } = await requireAdmin();
  const provider = String(form.get("provider") ?? "");
  const token = String(form.get("token") ?? "").trim();
  if (!isCrmProvider(provider)) return { error: "CRM inconnu." };
  if (membership.organization.isDemo) return { error: "La connexion d'un CRM n'est pas disponible dans la démo." };
  if (token.length < 10) return { error: "Collez le jeton d'accès de votre CRM." };
  try {
    await testCrm(provider, token);
    await db.organization.update({ where: { id: membership.organizationId }, data: { crmProvider: provider, crmTokenEnc: encryptCrmToken(token) } });
  } catch (e) {
    return { error: e instanceof CrmError ? e.message : "Connexion impossible : vérifiez le jeton." };
  }
  revalidatePath("/app", "layout");
  return { ok: "CRM connecté." };
}

export async function disconnectCrm() {
  const { membership } = await requireAdmin();
  await db.organization.update({ where: { id: membership.organizationId }, data: { crmProvider: null, crmTokenEnc: null } });
  revalidatePath("/app", "layout");
}

// « Mettre à jour mon CRM » : envoie les prospects de la bibliothèque ouverte (ou tous).
export async function updateCrm(searchId: string | null) {
  const { membership } = await requireMember();
  try {
    const r = await syncToCrm(membership.organization, searchId);
    revalidatePath("/app/prospects");
    return {
      ok: `${r.synced} fiche${r.synced > 1 ? "s" : ""} à jour dans le CRM${r.skipped ? ` · ${r.skipped} sans email ignorée${r.skipped > 1 ? "s" : ""}` : ""}${r.more ? " · recliquez pour la suite" : ""}.`,
    };
  } catch (e) {
    return { error: e instanceof CrmError ? e.message : "La mise à jour du CRM a échoué. Réessayez dans un instant." };
  }
}
