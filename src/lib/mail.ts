// Connexion Gmail / Outlook : OAuth, envoi d'emails et lecture des réponses des prospects.
// Appels HTTP directs aux API Google (Gmail) et Microsoft (Graph), sans SDK.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { MailAccount } from "@prisma/client";
import { db } from "./db";
import { appUrl } from "./auth";

export type Provider = "google" | "microsoft";
export const PROVIDER_LABEL: Record<Provider, string> = { google: "Gmail", microsoft: "Outlook" };

const CONF = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
    id: () => process.env.GOOGLE_CLIENT_ID ?? "",
    secret: () => process.env.GOOGLE_CLIENT_SECRET ?? "",
  },
  microsoft: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid email offline_access User.Read Mail.Send Mail.Read",
    id: () => process.env.MICROSOFT_CLIENT_ID ?? "",
    secret: () => process.env.MICROSOFT_CLIENT_SECRET ?? "",
  },
} as const;

export const isProvider = (p: string): p is Provider => p === "google" || p === "microsoft";
export const mailEnabled = (p: Provider) => Boolean(CONF[p].id() && CONF[p].secret() && process.env.TOKEN_ENCRYPTION_KEY);
const redirectUri = (p: Provider) => `${appUrl()}/api/mail/${p}/callback`;

export class MailError extends Error {}

// ---------- Chiffrement des jetons (AES-256-GCM) ----------
const key = () => {
  const k = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY ?? "", "base64");
  if (k.length !== 32) throw new MailError("TOKEN_ENCRYPTION_KEY manquante ou invalide.");
  return k;
};
export function encrypt(text: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}
function decrypt(value: string) {
  const [iv, tag, data] = value.split(".").map((s) => Buffer.from(s, "base64"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}

// ---------- OAuth ----------
export function authUrl(p: Provider, state: string) {
  const q = new URLSearchParams({ client_id: CONF[p].id(), redirect_uri: redirectUri(p), response_type: "code", scope: CONF[p].scope, state });
  if (p === "google") { q.set("access_type", "offline"); q.set("prompt", "consent"); }
  else q.set("prompt", "select_account");
  return `${CONF[p].authUrl}?${q}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number };

async function tokenRequest(p: Provider, params: Record<string, string>) {
  const res = await fetch(CONF[p].tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CONF[p].id(), client_secret: CONF[p].secret(), ...params }),
  });
  if (!res.ok) throw new MailError(`Connexion ${PROVIDER_LABEL[p]} refusée (${res.status}).`);
  return (await res.json()) as TokenResponse;
}

// Échange le code OAuth, récupère l'adresse de la boîte et enregistre le compte (un par utilisateur).
export async function connectAccount(p: Provider, code: string, userId: string) {
  const t = await tokenRequest(p, { grant_type: "authorization_code", code, redirect_uri: redirectUri(p) });
  if (!t.refresh_token) throw new MailError("Autorisation incomplète : recommencez la connexion.");
  const me = await fetch(p === "google" ? "https://openidconnect.googleapis.com/v1/userinfo" : "https://graph.microsoft.com/v1.0/me", {
    headers: { authorization: `Bearer ${t.access_token}` },
  }).then((r) => r.json() as Promise<{ email?: string; mail?: string; userPrincipalName?: string }>);
  const email = me.email ?? me.mail ?? me.userPrincipalName ?? "";
  const data = { provider: p, email, accessToken: encrypt(t.access_token), refreshToken: encrypt(t.refresh_token), expiresAt: new Date(Date.now() + (t.expires_in - 60) * 1000) };
  await db.mailAccount.upsert({ where: { userId }, update: { ...data, lastSyncAt: null }, create: { userId, ...data } });
  return email;
}

async function accessToken(a: MailAccount) {
  if (a.expiresAt > new Date()) return decrypt(a.accessToken);
  const p = a.provider as Provider;
  const t = await tokenRequest(p, { grant_type: "refresh_token", refresh_token: decrypt(a.refreshToken) });
  await db.mailAccount.update({
    where: { id: a.id },
    data: { accessToken: encrypt(t.access_token), expiresAt: new Date(Date.now() + (t.expires_in - 60) * 1000), ...(t.refresh_token ? { refreshToken: encrypt(t.refresh_token) } : {}) },
  });
  return t.access_token;
}

async function api<T>(a: MailAccount, url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${await accessToken(a)}`, "content-type": "application/json" } });
  if (res.status === 401 || res.status === 403) throw new MailError(`${PROVIDER_LABEL[a.provider as Provider]} a refusé l'accès : reconnectez votre boîte dans Paramètres.`);
  if (!res.ok) throw new MailError(`Erreur ${PROVIDER_LABEL[a.provider as Provider]} (${res.status}).`);
  return (res.status === 202 || res.status === 204 ? {} : await res.json()) as T;
}

// ---------- Envoi ----------
const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const encodeHeader = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString("base64")}?=`);

export type Outgoing = { to: string; subject: string; body: string; threadId?: string | null; inReplyTo?: string | null };
export type Sent = { providerId: string; threadId: string | null; messageId: string | null };

export async function sendMail(a: MailAccount, m: Outgoing): Promise<Sent> {
  if (a.provider === "google") {
    const headers = [
      `To: ${m.to}`,
      `Subject: ${encodeHeader(m.subject)}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      ...(m.inReplyTo ? [`In-Reply-To: ${m.inReplyTo}`, `References: ${m.inReplyTo}`] : []),
    ];
    const raw = `${headers.join("\r\n")}\r\n\r\n${Buffer.from(m.body).toString("base64")}`;
    const sent = await api<{ id: string; threadId: string }>(a, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      body: JSON.stringify({ raw: b64url(raw), ...(m.threadId ? { threadId: m.threadId } : {}) }),
    });
    const meta = await api<{ payload?: { headers?: { name: string; value: string }[] } }>(
      a, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${sent.id}?format=metadata&metadataHeaders=Message-Id`,
    ).catch(() => ({ payload: undefined }));
    const messageId = meta.payload?.headers?.find((h) => h.name.toLowerCase() === "message-id")?.value ?? null;
    return { providerId: sent.id, threadId: sent.threadId, messageId };
  }
  // Outlook : nouvel email à chaque étape (les réponses sont rattachées au prospect par l'adresse de l'expéditeur).
  await api(a, "https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    body: JSON.stringify({ message: { subject: m.subject, body: { contentType: "Text", content: m.body }, toRecipients: [{ emailAddress: { address: m.to } }] }, saveToSentItems: true }),
  });
  return { providerId: `ms-out-${Date.now()}-${randomBytes(4).toString("hex")}`, threadId: null, messageId: null };
}

// ---------- Lecture des réponses ----------
export type Incoming = { providerId: string; from: string; subject: string; snippet: string; at: Date };

const addr = (from: string) => (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();

// Emails reçus depuis `since` dont l'expéditeur fait partie de `senders`.
export async function fetchReplies(a: MailAccount, senders: string[], since: Date): Promise<Incoming[]> {
  const wanted = new Set(senders.map((s) => s.toLowerCase()));
  if (!wanted.size) return [];
  if (a.provider === "google") {
    const out: Incoming[] = [];
    const list = [...wanted];
    for (let i = 0; i < list.length; i += 25) {
      const q = `from:(${list.slice(i, i + 25).join(" OR ")}) after:${Math.floor(since.getTime() / 1000)}`;
      const res = await api<{ messages?: { id: string }[] }>(a, `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${encodeURIComponent(q)}`);
      for (const { id } of res.messages ?? []) {
        const m = await api<{ snippet: string; internalDate: string; payload: { headers: { name: string; value: string }[] } }>(
          a, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
        );
        const h = (n: string) => m.payload.headers.find((x) => x.name.toLowerCase() === n)?.value ?? "";
        out.push({ providerId: id, from: addr(h("from")), subject: h("subject"), snippet: m.snippet, at: new Date(Number(m.internalDate)) });
      }
    }
    return out.filter((m) => wanted.has(m.from));
  }
  const res = await api<{ value: { id: string; subject: string; bodyPreview: string; receivedDateTime: string; from?: { emailAddress?: { address?: string } } }[] }>(
    a, `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=100&$select=id,subject,bodyPreview,receivedDateTime,from&$filter=${encodeURIComponent(`receivedDateTime ge ${since.toISOString()}`)}`,
  );
  return res.value
    .map((m) => ({ providerId: m.id, from: (m.from?.emailAddress?.address ?? "").toLowerCase(), subject: m.subject, snippet: m.bodyPreview, at: new Date(m.receivedDateTime) }))
    .filter((m) => wanted.has(m.from));
}
