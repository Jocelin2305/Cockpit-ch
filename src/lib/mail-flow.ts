// Séquences envoyées depuis la boîte connectée, et réponses des prospects rapatriées.
import type { MailAccount, Prospect, SequenceTemplate } from "@prisma/client";
import { db } from "./db";
import { delaysFor } from "./cockpit";
import { fetchReplies, MailError, sendMail } from "./mail";
import { canRelance, isEmail, SEQ_STEPS, statusPatch, stepText, todayISO, tplDelays } from "./prospecting";

type WithTemplate = Prospect & { search: { template: SequenceTemplate | null } | null };

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
  const next = nextEmail(p, signature);
  if (!next) throw new MailError(`${p.company} : aucune étape email à envoyer (séquence terminée ou sans modèle).`);
  const lastOut = next.key === "email" ? null : await db.mailMessage.findFirst({ where: { prospectId: p.id, direction: "out" }, orderBy: { at: "desc" } });
  const subject = next.subject || (lastOut?.subject ? (/^re\s*:/i.test(lastOut.subject) ? lastOut.subject : `Re: ${lastOut.subject}`) : p.company);
  const sent = await sendMail(a, { to: p.email.trim(), subject, body: next.body, threadId: next.key === "email" ? null : p.mailThreadId, inReplyTo: next.key === "email" ? null : p.mailMessageId });
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
