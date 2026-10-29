// Enrichissement Apollo avec la clé API du client : email, LinkedIn, poste et site du bon contact.
// Recherche de personnes : gratuite ; enrichissement (bulk_match) : 1 crédit par contact trouvé.
// Les téléphones directs d'Apollo (8 crédits, livrés en différé) ne sont pas demandés ; le standard de l'entreprise l'est.
import type { Prisma, Prospect } from "@prisma/client";
import { db } from "./db";
import { decrypt } from "./mail";
import { has } from "./prospecting";
import { functionList, priorityFor, roleMatch } from "./scoring";

const API = "https://api.apollo.io/api/v1";
export const ENRICH_MAX = 25;

export class ApolloError extends Error {}

type Org = { website_url?: string | null; primary_domain?: string | null; phone?: string | null; sanitized_phone?: string | null; primary_phone?: { sanitized_number?: string | null } | null };
type Match = { id?: string; first_name?: string; last_name?: string; name?: string; title?: string | null; email?: string | null; email_status?: string | null; linkedin_url?: string | null; organization?: Org | null } | null;

async function call(key: string, path: string, query: [string, string][], body?: unknown) {
  const qs = new URLSearchParams();
  for (const [k, v] of query) qs.append(k, v);
  const res = await fetch(`${API}${path}${query.length ? `?${qs}` : ""}`, {
    method: "POST",
    headers: { "x-api-key": key, "Content-Type": "application/json", "Cache-Control": "no-cache", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 401) throw new ApolloError("Apollo refuse la clé API : vérifiez-la dans Paramètres.");
  if (res.status === 403) throw new ApolloError("Votre offre Apollo ne donne pas accès à l'API : vérifiez votre abonnement Apollo.");
  if (res.status === 429) throw new ApolloError("Limite d'appels Apollo atteinte : réessayez dans quelques minutes.");
  if (!res.ok) throw new ApolloError(`Apollo a répondu une erreur (${res.status}).`);
  return res.json();
}

// Vérifie la clé par une recherche gratuite d'une personne.
export const testApollo = (key: string) => call(key, "/mixed_people/api_search", [["per_page", "1"], ["person_titles[]", "ceo"]]);

async function bulkMatch(key: string, details: Record<string, string>[]) {
  const out: Match[] = [];
  for (let i = 0; i < details.length; i += 10) {
    const res = await call(key, "/people/bulk_match", [["reveal_personal_emails", "false"]], { details: details.slice(i, i + 10) });
    out.push(...((res.matches ?? []) as Match[]));
  }
  return out;
}

const domainOf = (o?: Org | null, website = "") =>
  (o?.primary_domain || (o?.website_url || website).replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "").toLowerCase();
const orgPhone = (o?: Org | null) => o?.primary_phone?.sanitized_number || o?.sanitized_phone || o?.phone || "";
const splitName = (n: string) => {
  const [first, ...rest] = n.trim().split(/\s+/);
  return { first_name: first ?? "", last_name: rest.join(" ") };
};
const fullName = (m: NonNullable<Match>) => m.name || [m.first_name, m.last_name].filter(Boolean).join(" ");

// Enrichit jusqu'à ENRICH_MAX prospects pas encore traités d'une recherche :
// 1) le dirigeant trouvé au registre (nom + entreprise) ; 2) si des fonctions sont visées et que le site est connu,
// la personne qui occupe ce poste devient le contact principal (le dirigeant reste dans les notes).
export async function enrichSearch(org: { id: string; apolloKeyEnc: string | null }, searchId: string | null, fonctions: string) {
  if (!org.apolloKeyEnc) throw new ApolloError("Connectez Apollo dans Paramètres pour enrichir les contacts.");
  let key: string;
  try { key = decrypt(org.apolloKeyEnc); } catch { throw new ApolloError("Clé Apollo illisible : reconnectez-la dans Paramètres."); }
  const todo = await db.prospect.findMany({
    where: { organizationId: org.id, enrichedAt: null, status: { notIn: ["Gagné", "Perdu"] }, ...(searchId ? { searchId } : {}) },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: ENRICH_MAX,
  });
  if (!todo.length) return { done: 0, found: 0, left: 0 };

  // 1. Le contact connu (dirigeant ou contact saisi), par son nom et son entreprise.
  const named = todo.filter((p) => has(p.contactName));
  const first = await bulkMatch(key, named.map((p) => ({ ...splitName(p.contactName), organization_name: p.company, ...(has(p.website) ? { domain: domainOf(null, p.website) } : {}) })));
  const byId = new Map(named.map((p, i) => [p.id, first[i] ?? null]));

  // 2. La fonction visée, dans l'entreprise dont on connaît le domaine (recherche gratuite, puis 1 crédit si trouvée).
  const titles = functionList(fonctions);
  const target = new Map<string, Match>();
  if (titles.length) {
    const wanted: { p: Prospect; id: string }[] = [];
    for (const p of todo) {
      const m = byId.get(p.id);
      const domain = domainOf(m?.organization, has(p.website) ? p.website : "");
      if (!domain || (m?.title && roleMatch(m.title, fonctions) === 2)) continue;
      const res = await call(key, "/mixed_people/api_search", [["q_organization_domains_list[]", domain], ["per_page", "3"], ...titles.map((t): [string, string] => ["person_titles[]", t])]);
      const hit = ((res.people ?? []) as { id?: string; title?: string }[]).find((x) => x.id && x.id !== m?.id);
      if (hit?.id) wanted.push({ p, id: hit.id });
    }
    const matches = await bulkMatch(key, wanted.map((w) => ({ id: w.id })));
    wanted.forEach((w, i) => matches[i] && target.set(w.p.id, matches[i]));
  }

  let found = 0;
  const now = new Date();
  for (const p of todo) {
    const leader = byId.get(p.id) ?? null;
    const main = target.get(p.id) ?? leader;
    const o = main?.organization ?? leader?.organization;
    const data: Prisma.ProspectUncheckedUpdateInput & Partial<Prospect> = { enrichedAt: now };
    if (main) {
      found++;
      const email = main.email && main.email_status !== "unavailable" ? main.email : "";
      Object.assign(data, {
        apolloId: main.id ?? null,
        ...(fullName(main) ? { contactName: fullName(main) } : {}),
        ...(main.title ? { contactRole: main.title } : {}),
        ...(email ? { email, emailVerified: main.email_status === "verified" } : {}),
        ...(main.linkedin_url ? { linkedin: main.linkedin_url } : {}),
      });
      if (target.has(p.id) && has(p.contactName)) data.notes = [p.notes, `Dirigeant : ${p.contactName}${p.contactRole ? ` (${p.contactRole})` : ""}`].filter(Boolean).join(" · ");
    }
    if (o?.website_url && !has(p.website)) data.website = o.website_url;
    if (orgPhone(o) && !has(p.phone)) data.phone = orgPhone(o);
    const merged = { ...p, ...data };
    // Seules les fiches trouvées automatiquement sont reclassées ; une priorité saisie à la main est conservée.
    if (p.source === "registre") data.priority = priorityFor(merged, fonctions);
    await db.prospect.update({ where: { id: p.id }, data });
  }
  const left = await db.prospect.count({ where: { organizationId: org.id, enrichedAt: null, status: { notIn: ["Gagné", "Perdu"] }, ...(searchId ? { searchId } : {}) } });
  return { done: todo.length, found, left };
}
