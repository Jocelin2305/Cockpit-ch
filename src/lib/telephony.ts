// Téléphonie : événements reçus par webhook (Aircall, Ringover ou format générique Cockpit'ch),
// rattachés aux prospects par leur numéro, et compte rendu IA automatique à partir de la transcription.
import { db } from "./db";
import { aiReady } from "./ai";
import { analyzeCallNotes } from "./ai-features";
import { callFields, clampMs, reportPatch, reportSchema } from "./calls";
import { addDays, FRAMEWORKS, todayISO, type Qualif } from "./prospecting";

export const PHONE_PROVIDERS = { aircall: "Aircall", ringover: "Ringover", generique: "Autre (format Cockpit'ch, Zapier, Make…)" } as const;
export type PhoneProvider = keyof typeof PHONE_PROVIDERS;
export const isPhoneProvider = (p: string): p is PhoneProvider => p in PHONE_PROVIDERS;

export type PhoneEventIn = {
  type: "ended" | "transcript" | "ignore";
  externalId: string;
  direction: "in" | "out";
  answered: boolean;
  number: string;
  agentEmail: string;
  durationMs: number;
  voicemailUrl: string;
  recordingUrl: string;
  transcript: string;
  at: Date;
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const str = (...vals: unknown[]) => { for (const v of vals) if (typeof v === "string" && v) return v; else if (typeof v === "number") return String(v); return ""; };
const num = (...vals: unknown[]) => { for (const v of vals) { const n = Number(v); if (v !== null && v !== undefined && v !== "" && Number.isFinite(n)) return n; } return 0; };
const date = (v: unknown) => { const n = Number(v); const d = Number.isFinite(n) && n > 0 ? new Date(n < 1e12 ? n * 1000 : n) : new Date(String(v ?? "")); return Number.isNaN(d.getTime()) ? new Date() : d; };
const dir = (v: unknown): "in" | "out" => (/^(in|inbound|incoming|entrant)/i.test(String(v ?? "")) ? "in" : "out");
// Transcription : texte brut, ou liste de segments { text } (formats des opérateurs).
const text = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((u) => { const o = obj(u); return [str(o.participant_type, o.speaker, o.channel), str(o.text, o.content)].filter(Boolean).join(" : "); }).filter(Boolean).join("\n");
  const o = obj(v);
  return o.utterances ? text(o.utterances) : str(o.text, o.content);
};

// Lecture tolérante des formats : les champs absents prennent une valeur neutre.
export function normalize(provider: PhoneProvider, body: unknown): PhoneEventIn {
  const b = obj(body);
  const d = obj(b.data);
  const event = str(b.event, b.type).toLowerCase();
  const base = { voicemailUrl: "", recordingUrl: "", transcript: "", agentEmail: "", number: "", durationMs: 0, answered: false, direction: "out" as const, at: new Date() };

  if (provider === "generique") {
    const transcript = text(b.transcript);
    return {
      ...base,
      type: event.includes("transcript") ? "transcript" : event.includes("end") || event === "" ? "ended" : "ignore",
      externalId: str(b.call_id, b.id),
      direction: dir(b.direction),
      answered: b.answered === true || b.answered === "true" || num(b.duration_seconds) > 0,
      number: str(b.number, b.phone),
      agentEmail: str(b.agent_email, b.user_email),
      durationMs: num(b.duration_seconds) * 1000,
      voicemailUrl: str(b.voicemail_url),
      recordingUrl: str(b.recording_url),
      transcript,
      at: date(b.started_at ?? b.date),
    };
  }

  const user = obj(d.user);
  const transcript = text(d.transcription ?? d.transcript ?? d.content);
  const direction = dir(d.direction);
  const externalId = str(d.call_id, d.id, obj(d.call).id);
  const isTranscript = event.includes("transcri");
  const isEnd = /ended|hangup|missed|voicemail|call\.end|answered/.test(event);
  if (provider === "aircall") {
    return {
      ...base,
      type: isTranscript ? "transcript" : isEnd ? "ended" : "ignore",
      externalId,
      direction,
      answered: Boolean(d.answered_at),
      number: str(d.raw_digits, obj(d.contact).phone_number),
      agentEmail: str(user.email),
      durationMs: num(d.duration) * 1000,
      voicemailUrl: str(d.voicemail),
      recordingUrl: str(d.recording, d.asset),
      transcript,
      at: date(d.started_at),
    };
  }
  // Ringover
  return {
    ...base,
    type: isTranscript ? "transcript" : isEnd ? "ended" : "ignore",
    externalId,
    direction,
    answered: d.is_answered === true || (num(d.incall_duration, d.duration) > 0 && !event.includes("missed")),
    number: direction === "in" ? str(d.from_number, d.contact_number) : str(d.to_number, d.contact_number),
    agentEmail: str(user.email, d.user_email),
    durationMs: num(d.incall_duration, d.duration) * 1000,
    voicemailUrl: str(d.voicemail, d.voicemail_url),
    recordingUrl: str(d.record, d.recording),
    transcript,
    at: date(d.start_time ?? b.timestamp),
  };
}

// Les 9 derniers chiffres suffisent à reconnaître un numéro, quel que soit son format (+33, 0033, 06…).
const key9 = (n: string) => n.replace(/\D/g, "").slice(-9);

export async function handlePhoneEvent(organizationId: string, ev: PhoneEventIn) {
  if (ev.type === "ignore" || !ev.externalId) return { status: "ignored" as const };
  const k = key9(ev.number);
  const [prospects, member] = await Promise.all([
    k.length === 9 ? db.prospect.findMany({ where: { organizationId, phone: { not: "" } } }) : Promise.resolve([]),
    ev.agentEmail ? db.membership.findFirst({ where: { organizationId, user: { email: ev.agentEmail.toLowerCase() } }, select: { userId: true } }) : Promise.resolve(null),
  ]);
  const p = prospects.find((x) => key9(x.phone) === k) ?? null;
  const userId = member?.userId ?? null;

  // Appel entrant non décroché : à rappeler, visible dans le Point du jour.
  if (ev.type === "ended" && ev.direction === "in" && !ev.answered) {
    await db.phoneEvent.upsert({
      where: { organizationId_externalId: { organizationId, externalId: ev.externalId } },
      update: { voicemailUrl: ev.voicemailUrl, transcript: ev.transcript, kind: ev.voicemailUrl ? "voicemail" : "missed" },
      create: { organizationId, externalId: ev.externalId, kind: ev.voicemailUrl ? "voicemail" : "missed", number: ev.number, prospectId: p?.id ?? null, userId, voicemailUrl: ev.voicemailUrl, transcript: ev.transcript, at: ev.at },
    });
    return { status: "missed" as const };
  }
  if (!p) return { status: "unknown_number" as const };

  const today = todayISO();
  let call = await db.call.findFirst({ where: { organizationId, externalId: ev.externalId } });
  // L'appel a peut-être déjà été noté à la main dans le panneau d'appel : on complète cette ligne.
  if (!call)
    call = await db.call.findFirst({
      where: { organizationId, prospectId: p.id, externalId: null, day: today, createdAt: { gte: new Date(ev.at.getTime() - 30 * 60_000) }, ...(userId ? { userId } : {}) },
      orderBy: { createdAt: "desc" },
    });
  const fields = {
    externalId: ev.externalId,
    ...(ev.durationMs ? { durationMs: clampMs(ev.durationMs) } : {}),
    ...(ev.recordingUrl ? { recordingUrl: ev.recordingUrl } : {}),
  };
  call = call
    ? await db.call.update({ where: { id: call.id }, data: fields })
    : await db.call.create({ data: { organizationId, prospectId: p.id, userId, day: today, issue: ev.answered || ev.type === "transcript" ? "Appel" : "Pas de réponse", ...fields } });

  if (ev.type === "ended") {
    const data: Record<string, unknown> = { lastCallAt: today };
    if (ev.direction === "out" && !ev.answered && !p.callBack) data.callBack = addDays(today, 2);
    await db.prospect.update({ where: { id: p.id }, data });
  }

  // Transcription : compte rendu IA appliqué directement à la fiche (une seule fois par appel).
  if (ev.transcript.trim().length > 50 && !call.resume) {
    await db.call.update({ where: { id: call.id }, data: { transcript: ev.transcript.slice(0, 15000), issue: "Appel" } });
    const org = await db.organization.findUnique({ where: { id: organizationId }, select: { aiKeyEnc: true } });
    if (org && aiReady(org)) {
      const fw = (p.qualif as Qualif | null)?.fw && FRAMEWORKS[(p.qualif as Qualif).fw] ? (p.qualif as Qualif).fw : "BANT";
      const r = await analyzeCallNotes({ organizationId, userId }, p, ev.transcript, FRAMEWORKS[fw]);
      const report = reportSchema.parse({ ...r, notes: ev.transcript, durationMs: call.durationMs, next: r.prochaineEtape, framework: fw });
      await db.$transaction([
        db.call.update({ where: { id: call.id }, data: callFields(report) }),
        db.prospect.update({ where: { id: p.id }, data: await reportPatch(p, report) }),
      ]);
      return { status: "analyzed" as const };
    }
  }
  return { status: "logged" as const };
}
