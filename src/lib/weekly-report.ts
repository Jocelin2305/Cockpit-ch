// Rapport hebdomadaire du gestionnaire : activité des 7 derniers jours comparée aux 7 précédents, par commercial.
import { db } from "./db";
import { addDays, todayISO } from "./prospecting";
import { appUrl, ROLES } from "./auth";
import { platformName } from "./branding";
import { sendPlatformEmail } from "./email";

type Counts = { calls: number; talks: number; emails: number; replies: number; rdv: number; won: number; added: number };
const ZERO: Counts = { calls: 0, talks: 0, emails: 0, replies: 0, rdv: 0, won: 0, added: 0 };
export const REPORT_ROWS: [keyof Counts, string][] = [
  ["added", "Prospects ajoutés"], ["emails", "Emails envoyés"], ["replies", "Réponses reçues"], ["calls", "Appels passés"],
  ["talks", "Conversations"], ["rdv", "Rendez-vous obtenus"], ["won", "Affaires gagnées"],
];

const dayStart = (iso: string) => new Date(`${iso}T00:00:00`);

export async function weeklyReport(organizationId: string, today = todayISO()) {
  const from = addDays(today, -7), prevFrom = addDays(today, -14);
  const [members, calls, mails, prospects, due, toCall] = await Promise.all([
    db.membership.findMany({ where: { organizationId }, include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } }),
    db.call.findMany({ where: { organizationId, day: { gte: prevFrom, lt: today } }, select: { userId: true, day: true, issue: true } }),
    db.mailMessage.findMany({ where: { organizationId, at: { gte: dayStart(prevFrom), lt: dayStart(today) } }, select: { userId: true, direction: true, at: true } }),
    db.prospect.findMany({
      where: { organizationId, OR: [{ createdAt: { gte: dayStart(prevFrom) } }, { rdvDay: { gte: prevFrom } }, { wonDay: { gte: prevFrom } }] },
      select: { ownerId: true, createdAt: true, rdvDay: true, wonDay: true, company: true, contactName: true, status: true },
    }),
    db.prospect.count({ where: { organizationId, status: { in: ["Contacté", "Relancé"] }, nextFollowUp: { lte: today } } }),
    db.prospect.count({ where: { organizationId, callBack: { not: null, lte: addDays(today, 7) }, status: { notIn: ["Gagné", "Perdu"] } } }),
  ]);
  const iso = (d: Date) => todayISO(d);
  const inWeek = (day: string | null | undefined, start: string) => !!day && day >= start && day < (start === from ? today : from);

  const count = (start: string, userId?: string) => {
    const mine = <T extends { userId?: string | null; ownerId?: string | null }>(r: T) => !userId || (r.userId ?? r.ownerId) === userId;
    const c = { ...ZERO };
    for (const x of calls) if (mine(x) && inWeek(x.day, start)) { c.calls++; if (x.issue === "Appel") c.talks++; }
    for (const m of mails) if (mine(m) && inWeek(iso(m.at), start)) { if (m.direction === "out") c.emails++; else c.replies++; }
    for (const p of prospects) {
      if (!mine(p)) continue;
      if (inWeek(iso(p.createdAt), start)) c.added++;
      if (inWeek(p.rdvDay, start)) c.rdv++;
      if (inWeek(p.wonDay, start)) c.won++;
    }
    return c;
  };

  const rdvs = prospects.filter((p) => inWeek(p.rdvDay, from)).map((p) => `${p.company}${p.contactName ? ` (${p.contactName})` : ""}`);
  return {
    from,
    to: addDays(today, -1),
    week: count(from),
    prev: count(prevFrom),
    team: members.length > 1 ? members.map((m) => ({ name: m.user.name, c: count(from, m.user.id) })) : [],
    rdvs,
    due,
    toCall,
  };
}

export type Report = Awaited<ReturnType<typeof weeklyReport>>;

const trend = (a: number, b: number) => (a === b ? "=" : a > b ? `+${a - b}` : `${a - b}`);
const fr = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

export function reportText(orgName: string, r: Report) {
  const lines = [
    `Rapport hebdomadaire de prospection : ${orgName}`,
    `Du ${fr(r.from)} au ${fr(r.to)}, comparé à la semaine précédente.`,
    "",
    ...REPORT_ROWS.map(([k, l]) => `${l} : ${r.week[k]} (${trend(r.week[k], r.prev[k])})`),
  ];
  if (r.rdvs.length) lines.push("", "Rendez-vous obtenus :", ...r.rdvs.slice(0, 15).map((x) => `- ${x}`));
  if (r.team.length) lines.push("", "Par commercial :", ...r.team.map((t) => `- ${t.name} : ${t.c.calls} appels, ${t.c.emails} emails, ${t.c.replies} réponses, ${t.c.rdv} RDV`));
  lines.push("", `Cette semaine : ${r.due} relance${r.due > 1 ? "s" : ""} à envoyer, ${r.toCall} rappel${r.toCall > 1 ? "s" : ""} prévu${r.toCall > 1 ? "s" : ""}.`);
  lines.push("", `Voir le détail : ${appUrl()}/app/tableau-de-bord`, "", "Vous recevez ce rapport chaque lundi en tant qu'administrateur. Pour ne plus le recevoir : Paramètres → Rapport hebdomadaire.");
  return lines.join("\n");
}

// Envoie le rapport à tous les gestionnaires. Une fois par semaine au plus par entreprise, sauf `force`.
export async function sendWeeklyReport(organizationId: string, opts: { force?: boolean; onlyUserId?: string } = {}) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    include: { memberships: { where: { role: ROLES.ADMIN }, include: { user: { select: { id: true, email: true } } } } },
  });
  if (!org) return 0;
  if (!opts.force && org.lastReportAt && Date.now() - org.lastReportAt.getTime() < 6 * 86_400_000) return 0;
  const r = await weeklyReport(organizationId);
  const text = reportText(org.name, r);
  const subject = `${await platformName(org)} · votre semaine :${r.week.rdv} RDV, ${r.week.replies} réponses, ${r.week.calls} appels`;
  let sent = 0;
  for (const m of org.memberships) {
    if (opts.onlyUserId && m.user.id !== opts.onlyUserId) continue;
    if (await sendPlatformEmail(m.user.email, subject, text)) sent++;
  }
  if (!opts.onlyUserId) await db.organization.update({ where: { id: organizationId }, data: { lastReportAt: new Date() } });
  return sent;
}
