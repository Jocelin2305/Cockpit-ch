"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { ApolloError, apolloReady, enrichSearch } from "@/lib/apollo";
import { CreditError } from "@/lib/credits";
import { runSourcing, SourcingError } from "@/lib/sourcing";

type Res = { ok?: string; error?: string };

// Nombre d'entreprises par lancement : le volume indiqué dans la recherche, entre 10 et 100 (50 par défaut).
const batch = (volume: string) => Math.min(100, Math.max(10, parseInt(volume, 10) || 50));
const shown = (e: unknown) => e instanceof SourcingError || e instanceof ApolloError || e instanceof CreditError;

// « Lancer la recherche » : nouvelles entreprises du registre, puis enrichissement si le service est disponible.
export async function launchProspectSearch(searchId: string): Promise<Res> {
  const { user, membership } = await requireMember();
  const org = membership.organization;
  const search = await db.search.findFirst({ where: { id: searchId, organizationId: org.id } });
  if (!search) return { error: "Recherche introuvable." };
  try {
    const r = await runSourcing(search, batch(search.volume));
    revalidatePath("/app", "layout");
    if (!r.added) return { ok: r.total ? "Aucune nouvelle entreprise : toutes celles trouvées sont déjà dans vos prospects." : "Aucune entreprise ne correspond à ces critères : élargissez la zone, le secteur ou l'effectif." };
    let msg = `${r.added} entreprise${r.added > 1 ? "s" : ""} ajoutée${r.added > 1 ? "s" : ""} (${r.total.toLocaleString("fr-FR")} correspondent à vos critères).`;
    if (apolloReady()) {
      try {
        const e = await enrichSearch(org, { searchId: search.id }, search.fonctions, user.id);
        msg += ` ${e.found} contact${e.found > 1 ? "s" : ""} enrichi${e.found > 1 ? "s" : ""} sur ${e.done}${e.left ? ` · ${e.left} restent à enrichir` : ""}.`;
      } catch (e) {
        // Les entreprises sont bien ajoutées : seul l'enrichissement attend.
        if (!(e instanceof CreditError)) throw e;
        msg += ` ${e.message}`;
      }
      revalidatePath("/app", "layout");
    }
    return { ok: msg };
  } catch (e) {
    revalidatePath("/app", "layout");
    return { error: shown(e) ? (e as Error).message : "La recherche a échoué. Réessayez dans un instant." };
  }
}

export async function enrichWithApollo(searchId: string | null): Promise<Res> {
  const { user, membership } = await requireMember();
  const org = membership.organization;
  const search = searchId ? await db.search.findFirst({ where: { id: searchId, organizationId: org.id }, select: { id: true, fonctions: true } }) : null;
  if (searchId && !search) return { error: "Recherche introuvable." };
  try {
    const e = await enrichSearch(org, { searchId: search?.id ?? null }, search?.fonctions ?? "", user.id);
    revalidatePath("/app", "layout");
    if (!e.done) return { ok: "Tous les prospects sont déjà enrichis." };
    return { ok: `${e.found} contact${e.found > 1 ? "s" : ""} enrichi${e.found > 1 ? "s" : ""} sur ${e.done}${e.left ? ` · ${e.left} restent, recliquez pour continuer` : ""}.` };
  } catch (e) {
    return { error: shown(e) ? (e as Error).message : "L'enrichissement a échoué. Réessayez dans un instant." };
  }
}

// Bouton « Enrichir » d'une ligne : email, LinkedIn et poste tout de suite ; téléphone direct envoyé quelques minutes plus tard.
export async function enrichProspect(prospectId: string): Promise<Res> {
  const { user, membership } = await requireMember();
  const org = membership.organization;
  const p = await db.prospect.findFirst({ where: { id: prospectId, organizationId: org.id }, select: { search: { select: { fonctions: true } } } });
  if (!p) return { error: "Prospect introuvable." };
  try {
    const e = await enrichSearch(org, { prospectId }, p.search?.fonctions ?? "", user.id);
    revalidatePath("/app", "layout");
    return e.found ? { ok: "Contact enrichi. Le téléphone direct, s'il existe, arrive dans quelques minutes." } : { ok: "Ce contact n'a pas encore été trouvé." };
  } catch (e) {
    return { error: shown(e) ? (e as Error).message : "L'enrichissement a échoué. Réessayez dans un instant." };
  }
}
