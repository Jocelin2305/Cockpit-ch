// Enrichissement Apollo : email, LinkedIn, poste et site du bon contact.
// Clé de la plateforme (APOLLO_API_KEY, à poser une fois l'accord revendeur signé), débitée en crédits.
// Recherche de personnes : gratuite ; enrichissement (bulk_match) : 1 crédit Apollo par contact trouvé, 8 de plus pour un mobile.
import type { Prisma, Prospect } from "@prisma/client";
import { createHmac } from "node:crypto";
import { appUrl } from "./auth";
import { CREDIT_COSTS, CREDIT_LABELS } from "./credit-grid";
import { CreditError, creditsLeft, emptyMessage, spendCredits } from "./credits";
import { db } from "./db";
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
  if (res.status === 401) throw new ApolloError("Le service d'enrichissement refuse la clé API.");
  if (res.status === 403) throw new ApolloError("L'offre du service d'enrichissement ne donne pas accès à l'API.");
  if (res.status === 429) throw new ApolloError("Limite d'appels du service d'enrichissement atteinte : réessayez dans quelques minutes.");
  if (!res.ok) throw new ApolloError(`Le service d'enrichissement a répondu une erreur (${res.status}).`);
  return res.json();
}

export const apolloReady = () => !!process.env.APOLLO_API_KEY;

// Téléphones directs : Apollo les livre plus tard sur un webhook public (HTTPS), signé par entreprise.
export const apolloWebhookToken = (orgId: string) => `${orgId}.${createHmac("sha256", process.env.TOKEN_ENCRYPTION_KEY ?? "cockpitch").update(`apollo:${orgId}`).digest("base64url").slice(0, 22)}`;
export function apolloWebhookOrg(token: string) {
  const [orgId] = token.split(".");
  return orgId && apolloWebhookToken(orgId) === token ? orgId : null;
}
const phoneParams = (orgId: string | null): [string, string][] =>
  orgId && appUrl().startsWith("https://") ? [["reveal_phone_number", "true"], ["webhook_url", `${appUrl()}/api/apollo/${apolloWebhookToken(orgId)}`]] : [];

async function bulkMatch(key: string, details: Record<string, string>[], phoneFor: string | null = null) {
  const out: Match[] = [];
  for (let i = 0; i < details.length; i += 10) {
    const res = await call(key, "/people/bulk_match", [["reveal_personal_emails", "false"], ...phoneParams(phoneFor)], { details: details.slice(i, i + 10) });
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
// `prospectId` : enrichissement manuel d'une ligne (même déjà traitée), téléphone direct compris quand c'est possible.
export async function enrichSearch(org: { id: string; resellerId: string | null }, scope: { searchId?: string | null; prospectId?: string }, fonctions: string, userId: string | null = null) {
  const { searchId = null, prospectId } = scope;
  const key = process.env.APOLLO_API_KEY ?? "";
  if (!key) throw new ApolloError("L'enrichissement des contacts n'est pas encore disponible : contactez le support.");
  // On ne traite que ce que les crédits peuvent payer.
  const available = await creditsLeft(org);
  if (available < CREDIT_COSTS.email) throw new CreditError(emptyMessage(org));
  const todo = await db.prospect.findMany({
    where: prospectId ? { id: prospectId, organizationId: org.id } : { organizationId: org.id, enrichedAt: null, status: { notIn: ["Gagné", "Perdu"] }, ...(searchId ? { searchId } : {}) },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: Math.min(ENRICH_MAX, Math.floor(available / CREDIT_COSTS.email)),
  });
  if (!todo.length) return { done: 0, found: 0, left: 0 };
  // Le téléphone direct n'est demandé que si les crédits peuvent le payer.
  const phoneFor = prospectId && available >= CREDIT_COSTS.email + CREDIT_COSTS.phone ? org.id : null;

  // 1. Le contact connu (dirigeant ou contact saisi), par son nom et son entreprise.
  const named = todo.filter((p) => has(p.contactName));
  const first = await bulkMatch(key, named.map((p) => ({ ...splitName(p.contactName), organization_name: p.company, ...(has(p.website) ? { domain: domainOf(null, p.website) } : {}) })), phoneFor);
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
    const matches = await bulkMatch(key, wanted.map((w) => ({ id: w.id })), phoneFor);
    wanted.forEach((w, i) => matches[i] && target.set(w.p.id, matches[i]));
  }

  let found = 0;
  let newEmails = 0;
  const now = new Date();
  for (const p of todo) {
    const leader = byId.get(p.id) ?? null;
    const main = target.get(p.id) ?? leader;
    const o = main?.organization ?? leader?.organization;
    const data: Prisma.ProspectUncheckedUpdateInput & Partial<Prospect> = { enrichedAt: now };
    if (main) {
      found++;
      const email = main.email && main.email_status !== "unavailable" ? main.email : "";
      if (email && email !== p.email) newEmails++;
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
  // Seuls les emails nouvellement trouvés sont débités.
  await spendCredits(org, newEmails * CREDIT_COSTS.email, CREDIT_LABELS.email, { userId, force: true });
  const left = await db.prospect.count({ where: { organizationId: org.id, enrichedAt: null, status: { notIn: ["Gagné", "Perdu"] }, ...(searchId ? { searchId } : {}) } });
  return { done: todo.length, found, left };
}
