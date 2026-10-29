// Séquences envoyées depuis la boîte connectée, et réponses des prospects rapatriées.
import { createHmac } from "node:crypto";
import type { MailAccount, Prospect, SequenceTemplate } from "@prisma/client";
import { appUrl } from "./auth";
import { db } from "./db";
import { delaysFor } from "./cockpit";
import { fetchReplies, MailError, sendMail } from "./mail";
import { canRelance, isDue, isEmail, SEQ_STEPS, statusPatch, stepText, todayISO, tplDelays } from "./prospecting";

type WithTemplate = Prospect & { search: { template: SequenceTemplate | null } | null };

// Lien de désinscription signé, ajouté à chaque email : il identifie le prospect sans pouvoir être deviné.
const unsubSig = (id: string) => createHmac("sha256", process.env.TOKEN_ENCRYPTION_KEY ?? "cockpitch").update(`desinscription:${id}`).digest("base64url").slice(0, 22);
export const unsubscribeUrl = (id: string) => `${appUrl()}/desinscription/${id}.${unsubSig(id)}`;
export function checkUnsubscribe(token: string) {
  const [id, sig] = token.split(".");
  return id && sig && sig === unsubSig(id) ? id : null;
}
const FOOTER = (id: string) => `

--
Pour ne plus recevoir mes messages : ${unsubscribeUrl(id)}`;

// Prospect désinscrit, ou email présent dans la liste d'opposition de l'entreprise.
export async function isOptedOut(p: Pick<Prospect, "organizationId" | "email" | "optOutAt">) {
  if (p.optOutAt) return true;
  const email = p.email.trim().toLowerCase();
  return !!email && !!(await db.optOut.findUnique({ where: { organizationId_email: { organizationId: p.organizationId, email } } }));
}

// Prochaine étape email du prospect : J0 s'il n'a jamais été contacté, sinon la relance suivante.
export function nextEmail(p: WithTemplate, signature: string) {
  const status = p.status ?? "À contacter";
  const key = status === "À contacter" ? "email" : ["Contacté", "Relancé"].includes(status) && canRelance(p, tplDelays(p.search?.template?.delays).length) ? `relance${(p.relances ?? 0) + 1}` : null;
  const step = SEQ_STEPS.find((s) => s.k === key);
  if (!step || !p.search?.template) return null;
  const t = stepText(step.k, step.subj, p, p.search.template.steps, signature);
  if (!t.body.trim()) return null;
  const subject = t.subject.trim();
  return { key: step.k, subject, body: t.body };
}

// Envoie l'étape suivante, l'enregistre et fait avancer la séquence (statut, prochaine relance).
export async function sendStep(a: MailAccount, p: WithTemplate, userId: string, signature: string) {
  if (!isEmail(p.email)) throw new MailError(`${p.company} : pas d'email valide.`);
  if (await isOptedOut(p)) throw new MailError(`${p.company} : ce contact s'est désinscrit, aucun email ne lui est envoyé.`);
  const next = nextEmail(p, signature);
  if (!next) throw new MailError(`${p.company} : aucune étape email à envoyer (séquence terminée ou sans modèle).`);
  const lastOut = next.key === "email" ? null : await db.mailMessage.findFirst({ where: { prospectId: p.id, direction: "out" }, orderBy: { at: "desc" } });
  const subject = next.subject || (lastOut?.subject ? (/^re\s*:/i.test(lastOut.subject) ? lastOut.subject : `Re: ${lastOut.subject}`) : p.company);
  const sent = await sendMail(a, { to: p.email.trim(), subject, body: next.body + FOOTER(p.id), threadId: next.key === "email" ? null : p.mailThreadId, inReplyTo: next.key === "email" ? null : p.mailMessageId });
  const today = todayISO();
  const status = next.key === "email" ? "Contacté" : "Relancé";
  await db.$transaction([
    db.mailMessage.create({ data: { organizationId: p.organizationId, prospectId: p.id, userId, direction: "out", providerId: sent.providerId, subject, snippet: next.body.slice(0, 200), at: new Date() } }),
    db.prospect.update({
      where: { id: p.id },
      data: {
        ...statusPatch(p, status, await delaysFor(p.organizationId, p.searchId), today),
        ...(sent.threadId ? { mailThreadId: sent.threadId } : {}),
        ...(sent.messageId ? { mailMessageId: sent.messageId } : {}),
      },
    }),
  ]);
  return subject;
}

const SYNC_EVERY = 10 * 60_000;

// Rapatrie les réponses des prospects depuis la dernière synchronisation (14 jours au plus) ;
// un prospect qui répond passe en « A répondu » et sort des relances automatiques.
export async function syncReplies(a: MailAccount, organizationId: string, force = false) {
  if (!force && a.lastSyncAt && Date.now() - a.lastSyncAt.getTime() < SYNC_EVERY) return 0;
  const since = new Date(Math.max(a.lastSyncAt?.getTime() ?? 0, Date.now() - 14 * 86_400_000));
  const prospects = await db.prospect.findMany({ where: { organizationId, email: { contains: "@" } }, select: { id: true, email: true, status: true, firstContact: true, lastContact: true, relances: true, nextFollowUp: true, searchId: true } });
  const byEmail = new Map(prospects.map((p) => [p.email.trim().toLowerCase(), p]));
  const replies = await fetchReplies(a, [...byEmail.keys()], since);
  let added = 0;
  const today = todayISO();
  for (const r of replies) {
    const p = byEmail.get(r.from);
    if (!p) continue;
    const exists = await db.mailMessage.findUnique({ where: { userId_providerId: { userId: a.userId, providerId: r.providerId } } });
    if (exists) continue;
    await db.mailMessage.create({ data: { organizationId, prospectId: p.id, userId: a.userId, direction: "in", providerId: r.providerId, subject: r.subject.slice(0, 300), snippet: r.snippet.slice(0, 400), at: r.at } });
    if (["Contacté", "Relancé"].includes(p.status))
      await db.prospect.update({ where: { id: p.id }, data: statusPatch(p, "A répondu", await delaysFor(organizationId, p.searchId), today) });
    added++;
  }
  await db.mailAccount.update({ where: { id: a.id }, data: { lastSyncAt: new Date() } });
  return added;
}

const BATCH_MAX = 50;

// Relances dues (et, sur demande, emails J0 prêts) depuis une boîte, après avoir rapatrié les réponses.
// `ownOnly` : uniquement les prospects de cet utilisateur ou sans responsable (envoi automatique).
export async function sendDue(a: MailAccount, organizationId: string, signature: string, opts: { includeFirst: boolean; ownOnly?: boolean }) {
  await syncReplies(a, organizationId, true).catch(() => 0);
  const today = todayISO();
  const all = await db.prospect.findMany({
    where: {
      organizationId,
      optOutAt: null,
      status: { in: opts.includeFirst ? ["À contacter", "Contacté", "Relancé"] : ["Contacté", "Relancé"] },
      searchId: { not: null },
      ...(opts.ownOnly ? { OR: [{ ownerId: a.userId }, { ownerId: null }] } : {}),
    },
    include: { search: { include: { template: true } } },
  });
  const todo = all.filter((p) => (p.status === "À contacter" ? p.email.includes("@") : isDue(p, today))).slice(0, BATCH_MAX);
  let sent = 0;
  const errors: string[] = [];
  for (const p of todo) {
    try { await sendStep(a, p, a.userId, signature); sent++; } catch (e) { errors.push(e instanceof MailError ? e.message : "envoi impossible"); if (!(e instanceof MailError)) break; }
  }
  return { todo: todo.length, sent, errors };
}
