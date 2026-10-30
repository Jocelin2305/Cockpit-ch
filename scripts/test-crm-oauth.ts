// Vérifie la connexion du CRM par compte, avec des réponses simulées : npx tsx --env-file=.env scripts/test-crm-oauth.ts
// Crée une entreprise de test puis la supprime. Aucun appel réel à HubSpot ou Pipedrive.
import { syncToCrm } from "../src/lib/crm";
import { connectCrmAccount, crmAccess, crmAuthUrl, crmOauthEnabled, CrmError } from "../src/lib/crm-oauth";
import { db } from "../src/lib/db";
import { decrypt } from "../src/lib/mail";

let failed = 0;
const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "OK    " : "ÉCHEC "} ${name}${ok ? "" : ` : obtenu ${JSON.stringify(got)}, attendu ${JSON.stringify(want)}`}`);
};

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];
let reply: (url: string) => Response = () => new Response("{}");
globalThis.fetch = (async (url: string, init: RequestInit) => {
  calls.push({ url: String(url), init });
  return reply(String(url));
}) as typeof fetch;
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });

async function main() {
  const org = await db.organization.create({ data: { name: `test-crm-${Date.now()}` } });
  const reload = () => db.organization.findUniqueOrThrow({ where: { id: org.id } });
  try {
    check("sans identifiants : indisponible", crmOauthEnabled("hubspot"), false);
    process.env.HUBSPOT_CLIENT_ID = "hs-id";
    process.env.HUBSPOT_CLIENT_SECRET = "hs-secret";
    process.env.PIPEDRIVE_CLIENT_ID = "pd-id";
    process.env.PIPEDRIVE_CLIENT_SECRET = "pd-secret";
    check("avec identifiants : disponible", crmOauthEnabled("hubspot"), true);

    // HubSpot : autorisation, puis échange avec les identifiants dans le corps.
    const hs = new URL(crmAuthUrl("hubspot", "etat"));
    check("HubSpot : adresse d'autorisation", hs.origin + hs.pathname, "https://app.hubspot.com/oauth/authorize");
    check("HubSpot : droits demandés", hs.searchParams.get("scope"), "oauth crm.objects.contacts.read crm.objects.contacts.write");
    check("HubSpot : état transmis", hs.searchParams.get("state"), "etat");
    reply = () => json({ access_token: "hs-a1", refresh_token: "hs-r1", expires_in: 1800 });
    await connectCrmAccount("hubspot", "code1", org.id);
    const body = new URLSearchParams(String(calls[0].init.body));
    check("HubSpot : point d'échange", calls[0].url, "https://api.hubapi.com/oauth/2026-03/token");
    check("HubSpot : identifiants dans le corps", [body.get("client_id"), body.get("client_secret"), body.get("code"), body.get("grant_type")], ["hs-id", "hs-secret", "code1", "authorization_code"]);
    let row = await reload();
    check("jetons chiffrés en base", [row.crmTokenEnc === "hs-a1", decrypt(row.crmTokenEnc!), decrypt(row.crmRefreshEnc!)], [false, "hs-a1", "hs-r1"]);

    // Jeton encore valide : aucun renouvellement.
    calls = [];
    check("jeton valide réutilisé", await crmAccess(row, "hubspot"), { token: "hs-a1", domain: null });
    check("aucun appel de renouvellement", calls.length, 0);

    // Jeton expiré : renouvelé et réenregistré.
    await db.organization.update({ where: { id: org.id }, data: { crmExpiresAt: new Date(Date.now() - 1000) } });
    reply = () => json({ access_token: "hs-a2", refresh_token: "hs-r2", expires_in: 1800 });
    check("jeton expiré renouvelé", (await crmAccess(await reload(), "hubspot")).token, "hs-a2");
    check("demande de renouvellement", new URLSearchParams(String(calls[0].init.body)).get("refresh_token"), "hs-r1");
    row = await reload();
    check("nouveaux jetons enregistrés", [decrypt(row.crmTokenEnc!), decrypt(row.crmRefreshEnc!), row.crmExpiresAt! > new Date()], ["hs-a2", "hs-r2", true]);

    // Accès révoqué : message lisible.
    await db.organization.update({ where: { id: org.id }, data: { crmExpiresAt: new Date(Date.now() - 1000) } });
    reply = () => json({ error: "invalid_grant" }, 400);
    const refused = await crmAccess(await reload(), "hubspot").then(() => "", (e) => (e instanceof CrmError ? e.message : "autre"));
    check("accès révoqué", refused, "L'accès au CRM a expiré : reconnectez-le dans Paramètres.");

    // Pipedrive : Basic, adresse propre au client, et envoi avec le jeton en en-tête.
    calls = [];
    reply = () => json({ access_token: "pd-a1", refresh_token: "pd-r1", expires_in: 3600, api_domain: "https://masociete.pipedrive.com" });
    await connectCrmAccount("pipedrive", "code2", org.id);
    const pdHeaders = calls[0].init.headers as Record<string, string>;
    check("Pipedrive : identification Basic", pdHeaders.Authorization, `Basic ${Buffer.from("pd-id:pd-secret").toString("base64")}`);
    check("Pipedrive : pas de secret dans le corps", new URLSearchParams(String(calls[0].init.body)).has("client_secret"), false);
    await db.prospect.create({ data: { organizationId: org.id, company: "Société Test", contactName: "Ana Test", email: "ana@exemple.fr" } });
    calls = [];
    reply = (url) => json({ data: { id: url.includes("/persons") ? 7 : 3 } });
    const r = await syncToCrm(await reload(), null);
    check("fiche envoyée", r.synced, 1);
    check("Pipedrive : adresse du client", calls.map((c) => c.url), ["https://masociete.pipedrive.com/api/v1/organizations", "https://masociete.pipedrive.com/api/v1/persons"]);
    check("Pipedrive : jeton en en-tête, jamais dans l'adresse", [(calls[0].init.headers as Record<string, string>).Authorization, calls[0].url.includes("api_token")], ["Bearer pd-a1", false]);

    // Une adresse étrangère est refusée : le jeton ne part jamais ailleurs.
    reply = () => json({ access_token: "x", refresh_token: "y", expires_in: 3600, api_domain: "https://pirate.exemple.com" });
    check("adresse étrangère refusée", await connectCrmAccount("pipedrive", "code3", org.id).then(() => false, (e) => e instanceof CrmError), true);
  } finally {
    await db.organization.delete({ where: { id: org.id } });
    await db.$disconnect();
  }
  console.log(failed ? `\n${failed} échec(s)` : "\nTout est bon");
  process.exit(failed ? 1 : 0);
}
main();
