// CRM connecté par l'entreprise (compte autorisé, ou jeton collé à la main) : les prospects y sont créés ou mis à jour à la demande.
import type { Prospect } from "@prisma/client";
import { db } from "./db";
import { encrypt } from "./mail";
import { crmAccess, CrmError, type CrmAuth } from "./crm-oauth";
import { has, isEmail } from "./prospecting";
import { isCrmProvider, type CrmProvider } from "./crm-providers";

export * from "./crm-providers";

export { CrmError };

const SYNC_MAX = 200;

async function call(url: string, init: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...rest.headers },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 401 || res.status === 403) throw new CrmError("Le CRM refuse le jeton : reconnectez-le dans Paramètres.");
  if (res.status === 429) throw new CrmError("Le CRM limite les envois : réessayez dans une minute.");
  if (!res.ok) throw new CrmError(`Le CRM a répondu une erreur (${res.status}).`);
  return res.json();
}

const pd = (path: string, token: string) => `https://api.pipedrive.com/v1${path}${path.includes("?") ? "&" : "?"}api_token=${encodeURIComponent(token)}`;
// Compte autorisé : adresse propre à l'entreprise et jeton en en-tête. Jeton collé : adresse générale.
const pdCall = (auth: CrmAuth, path: string, init: RequestInit = {}) =>
  auth.domain ? call(`${auth.domain}/api/v1${path}`, { ...init, token: auth.token }) : call(pd(path, auth.token), init);

// Vérifie le jeton avant de l'enregistrer.
export async function testCrm(provider: CrmProvider, token: string) {
  if (provider === "hubspot") await call("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", { token });
  else await call(pd("/users/me", token));
}

export const encryptCrmToken = (token: string) => encrypt(token);

// Valeur à envoyer : vide si « À enrichir ».
const v = (s: string) => (has(s) ? s.trim() : "");

const splitName = (n: string) => {
  const [first, ...rest] = n.trim().split(/\s+/);
  return { first: first ?? "", last: rest.join(" ") };
};

// Statut Cockpit'ch → statut de lead HubSpot.
const HS_STATUS: Record<string, string> = {
  "À contacter": "NEW",
  Contacté: "ATTEMPTED_TO_CONTACT",
  Relancé: "ATTEMPTED_TO_CONTACT",
  "A répondu": "CONNECTED",
  "RDV planifié": "IN_PROGRESS",
  Gagné: "OPEN_DEAL",
  Perdu: "UNQUALIFIED",
};

async function syncHubspot(token: string, prospects: Prospect[]) {
  const withEmail = prospects.filter((p) => isEmail(p.email));
  const ids = new Map<string, string>();
  for (let i = 0; i < withEmail.length; i += 100) {
    const batch = withEmail.slice(i, i + 100);
    const res = await call("https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert", {
      method: "POST",
      token,
      body: JSON.stringify({
        inputs: batch.map((p) => {
          const n = splitName(p.contactName);
          return {
            idProperty: "email",
            id: p.email.trim().toLowerCase(),
            properties: { email: p.email.trim().toLowerCase(), firstname: n.first, lastname: n.last, company: p.company, jobtitle: v(p.contactRole), phone: v(p.phone), city: v(p.city), website: v(p.website), hs_lead_status: HS_STATUS[p.status] ?? "NEW" },
          };
        }),
      }),
    });
    for (const r of (res.results ?? []) as { id: string; properties?: { email?: string } }[]) if (r.properties?.email) ids.set(r.properties.email.toLowerCase(), r.id);
  }
  return { ids: new Map(withEmail.map((p) => [p.id, ids.get(p.email.trim().toLowerCase()) ?? null])), skipped: prospects.length - withEmail.length };
}

async function syncPipedrive(auth: CrmAuth, prospects: Prospect[]) {
  const ids = new Map<string, string | null>();
  for (const p of prospects) {
    const person = {
      name: v(p.contactName) || p.company,
      ...(isEmail(p.email) ? { email: [{ value: p.email.trim(), primary: true }] } : {}),
      ...(has(p.phone) ? { phone: [{ value: p.phone.trim(), primary: true }] } : {}),
      job_title: v(p.contactRole) || undefined,
    };
    if (p.crmId) {
      await pdCall(auth, `/persons/${p.crmId}`, { method: "PUT", body: JSON.stringify(person) });
      ids.set(p.id, p.crmId);
      continue;
    }
    const org = await pdCall(auth, "/organizations", { method: "POST", body: JSON.stringify({ name: p.company }) });
    const res = await pdCall(auth, "/persons", { method: "POST", body: JSON.stringify({ ...person, org_id: org.data?.id }) });
    ids.set(p.id, res.data?.id ? String(res.data.id) : null);
  }
  return { ids, skipped: 0 };
}

// Envoie au CRM les prospects (d'une recherche, ou tous) ; renvoie le nombre de fiches à jour.
export async function syncToCrm(org: Parameters<typeof crmAccess>[0], searchId: string | null) {
  if (!org.crmProvider || !org.crmTokenEnc || !isCrmProvider(org.crmProvider)) throw new CrmError("Aucun CRM connecté.");
  const auth = await crmAccess(org, org.crmProvider);
  const prospects = await db.prospect.findMany({
    where: { organizationId: org.id, ...(searchId ? { searchId } : {}) },
    orderBy: { crmSyncedAt: { sort: "asc", nulls: "first" } },
    take: SYNC_MAX,
  });
  const { ids, skipped } = org.crmProvider === "hubspot" ? await syncHubspot(auth.token, prospects) : await syncPipedrive(auth, prospects);
  const now = new Date();
  const done = [...ids].filter(([, crmId]) => crmId);
  await db.$transaction(done.map(([id, crmId]) => db.prospect.update({ where: { id }, data: { crmId, crmSyncedAt: now } })));
  return { synced: done.length, skipped, more: prospects.length === SYNC_MAX };
}
