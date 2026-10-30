// Connexion du CRM par le compte du client (OAuth) : autorisation, échange du code, renouvellement du jeton.
// Sans identifiants d'application dans l'environnement, seul le jeton collé à la main reste proposé.
import { appUrl } from "./auth";
import { db } from "./db";
import { decrypt, encrypt } from "./mail";
import type { CrmProvider } from "./crm-providers";

export class CrmError extends Error {}

type Config = { env: string; authorize: string; token: string; scope: string; basicAuth: boolean };

const CONFIG: Record<CrmProvider, Config> = {
  hubspot: {
    env: "HUBSPOT",
    authorize: "https://app.hubspot.com/oauth/authorize",
    token: "https://api.hubapi.com/oauth/2026-03/token",
    scope: "oauth crm.objects.contacts.read crm.objects.contacts.write",
    basicAuth: false,
  },
  // Les droits de Pipedrive se règlent dans l'application (contacts:full), pas dans l'adresse.
  pipedrive: { env: "PIPEDRIVE", authorize: "https://oauth.pipedrive.com/oauth/authorize", token: "https://oauth.pipedrive.com/oauth/token", scope: "", basicAuth: true },
};

const credentials = (p: CrmProvider) => {
  const id = process.env[`${CONFIG[p].env}_CLIENT_ID`];
  const secret = process.env[`${CONFIG[p].env}_CLIENT_SECRET`];
  return id && secret ? { id, secret } : null;
};

export const crmOauthEnabled = (p: CrmProvider) => !!credentials(p);
const redirectUri = (p: CrmProvider) => `${appUrl()}/api/crm/${p}/callback`;

export function crmAuthUrl(p: CrmProvider, state: string) {
  const c = CONFIG[p];
  const qs = new URLSearchParams({ client_id: credentials(p)!.id, redirect_uri: redirectUri(p), state, ...(c.scope ? { scope: c.scope } : {}) });
  return `${c.authorize}?${qs}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in?: number; api_domain?: string };

async function tokenRequest(p: CrmProvider, params: Record<string, string>): Promise<TokenResponse> {
  const creds = credentials(p);
  if (!creds) throw new CrmError("La connexion à ce CRM n'est pas encore disponible.");
  const c = CONFIG[p];
  const res = await fetch(c.token, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(c.basicAuth ? { Authorization: `Basic ${Buffer.from(`${creds.id}:${creds.secret}`).toString("base64")}` } : {}),
    },
    body: new URLSearchParams({ ...params, ...(c.basicAuth ? {} : { client_id: creds.id, client_secret: creds.secret }) }),
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 400 || res.status === 401) throw new CrmError("L'accès au CRM a expiré : reconnectez-le dans Paramètres.");
  if (!res.ok) throw new CrmError(`Le CRM a répondu une erreur (${res.status}).`);
  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) throw new CrmError("Le CRM n'a pas renvoyé d'accès : reconnectez-le dans Paramètres.");
  return data;
}

// Adresse d'API propre à l'entreprise chez Pipedrive : on n'y envoie le jeton que si c'est bien un domaine Pipedrive.
const safeDomain = (d?: string) => {
  try {
    const u = new URL(d ?? "");
    return u.protocol === "https:" && u.hostname.endsWith(".pipedrive.com") ? u.origin : null;
  } catch {
    return null;
  }
};

const tokenFields = (t: TokenResponse) => ({
  crmTokenEnc: encrypt(t.access_token),
  ...(t.refresh_token ? { crmRefreshEnc: encrypt(t.refresh_token) } : {}),
  crmExpiresAt: t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null,
});

// Retour de l'autorisation : le code est échangé contre les jetons, enregistrés chiffrés.
export async function connectCrmAccount(p: CrmProvider, code: string, organizationId: string) {
  const t = await tokenRequest(p, { grant_type: "authorization_code", code, redirect_uri: redirectUri(p) });
  const domain = p === "pipedrive" ? safeDomain(t.api_domain) : null;
  if (p === "pipedrive" && !domain) throw new CrmError("Pipedrive n'a pas indiqué d'adresse valide pour votre compte.");
  await db.organization.update({ where: { id: organizationId }, data: { crmProvider: p, crmApiDomain: domain, ...tokenFields(t) } });
}

export type CrmAuth = { token: string; domain: string | null };
type CrmOrg = { id: string; crmProvider: string | null; crmTokenEnc: string | null; crmRefreshEnc: string | null; crmExpiresAt: Date | null; crmApiDomain: string | null };

// Jeton utilisable : renouvelé une minute avant son expiration quand le compte est connecté par OAuth.
export async function crmAccess(org: CrmOrg, p: CrmProvider): Promise<CrmAuth> {
  try {
    if (org.crmRefreshEnc && org.crmExpiresAt && org.crmExpiresAt.getTime() - Date.now() < 60_000) {
      const t = await tokenRequest(p, { grant_type: "refresh_token", refresh_token: decrypt(org.crmRefreshEnc) });
      await db.organization.update({ where: { id: org.id }, data: tokenFields(t) });
      return { token: t.access_token, domain: org.crmApiDomain };
    }
    return { token: decrypt(org.crmTokenEnc ?? ""), domain: org.crmApiDomain };
  } catch (e) {
    if (e instanceof CrmError) throw e;
    throw new CrmError("Accès au CRM illisible : reconnectez-le dans Paramètres.");
  }
}
