"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireMember } from "@/lib/auth";
import { encrypt } from "@/lib/mail";
import { ApolloError, enrichSearch, testApollo } from "@/lib/apollo";
import { runSourcing, SourcingError } from "@/lib/sourcing";
import type { FormState } from "@/lib/validation";

type Res = { ok?: string; error?: string };

// Nombre d'entreprises par lancement : le volume indiqué dans la recherche, entre 10 et 100 (50 par défaut).
const batch = (volume: string) => Math.min(100, Math.max(10, parseInt(volume, 10) || 50));

// « Lancer la recherche » : nouvelles entreprises du registre, puis enrichissement Apollo si la clé est connectée.
export async function launchProspectSearch(searchId: string): Promise<Res> {
  const { membership } = await requireMember();
  const org = membership.organization;
  const search = await db.search.findFirst({ where: { id: searchId, organizationId: org.id } });
  if (!search) return { error: "Recherche introuvable." };
  try {
    const r = await runSourcing(search, batch(search.volume));
    revalidatePath("/app", "layout");
    if (!r.added) return { ok: r.total ? "Aucune nouvelle entreprise : toutes celles trouvées sont déjà dans vos prospects." : "Aucune entreprise ne correspond à ces critères : élargissez la zone, le secteur ou l'effectif." };
    let msg = `${r.added} entreprise${r.added > 1 ? "s" : ""} ajoutée${r.added > 1 ? "s" : ""} (${r.total.toLocaleString("fr-FR")} correspondent à vos critères).`;
    if (org.apolloKeyEnc) {
      const e = await enrichSearch(org, search.id, search.fonctions);
      msg += ` Apollo : ${e.found} contact${e.found > 1 ? "s" : ""} enrichi${e.found > 1 ? "s" : ""} sur ${e.done}${e.left ? ` · ${e.left} restent à enrichir` : ""}.`;
    }
    return { ok: msg };
  } catch (e) {
    revalidatePath("/app", "layout");
    return { error: e instanceof SourcingError || e instanceof ApolloError ? e.message : "La recherche a échoué. Réessayez dans un instant." };
  }
}

export async function enrichWithApollo(searchId: string | null): Promise<Res> {
  const { membership } = await requireMember();
  const org = membership.organization;
  const search = searchId ? await db.search.findFirst({ where: { id: searchId, organizationId: org.id }, select: { id: true, fonctions: true } }) : null;
  if (searchId && !search) return { error: "Recherche introuvable." };
  try {
    const e = await enrichSearch(org, search?.id ?? null, search?.fonctions ?? "");
    revalidatePath("/app", "layout");
    if (!e.done) return { ok: "Tous les prospects sont déjà enrichis." };
    return { ok: `Apollo : ${e.found} contact${e.found > 1 ? "s" : ""} enrichi${e.found > 1 ? "s" : ""} sur ${e.done}${e.left ? ` · ${e.left} restent, recliquez pour continuer` : ""}.` };
  } catch (e) {
    return { error: e instanceof ApolloError ? e.message : "L'enrichissement a échoué. Réessayez dans un instant." };
  }
}

export async function connectApollo(_: FormState, form: FormData): Promise<FormState> {
  const { membership } = await requireAdmin();
  const key = String(form.get("key") ?? "").trim();
  if (key.length < 10) return { error: "Collez la clé API de votre compte Apollo." };
  try {
    await testApollo(key);
    await db.organization.update({ where: { id: membership.organizationId }, data: { apolloKeyEnc: encrypt(key) } });
  } catch (e) {
    return { error: e instanceof ApolloError ? e.message : "Connexion impossible : vérifiez la clé." };
  }
  revalidatePath("/app", "layout");
  return { ok: "Apollo connecté." };
}

export async function disconnectApollo() {
  const { membership } = await requireAdmin();
  await db.organization.update({ where: { id: membership.organizationId }, data: { apolloKeyEnc: null } });
  revalidatePath("/app", "layout");
}

