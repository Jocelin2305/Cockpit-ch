// Règles métier du Cockpit, partagées entre serveur et navigateur (fonctions pures).
// Reprises du prototype : statuts, relances (J0 + 5 emails), LinkedIn en parallèle, complétude, qualification.

export const STATUSES = ["À contacter", "Contacté", "Relancé", "A répondu", "RDV planifié", "Gagné", "Perdu"] as const;
export type Status = (typeof STATUSES)[number];

export const PRIO: Record<string, string> = { A: "Haute", B: "Moyenne", C: "Basse" };

export const FRAMEWORKS: Record<string, string[]> = {
  BANT: ["Budget", "Autorité", "Besoin", "Délai"],
  MEDDIC: ["Métriques", "Acheteur économique", "Critères de décision", "Processus de décision", "Douleur identifiée", "Champion"],
  SPICED: ["Situation", "Problème", "Impact", "Événement critique", "Décision"],
  CHAMP: ["Défis", "Autorité", "Argent", "Priorité"],
};

export type FieldDef = { key: ProspectTextKey; label: string; group: "ind" | "util" | "coord" | "opt" | "pil"; area?: boolean };
export type ProspectTextKey =
  | "company" | "sector" | "city" | "size" | "contactName" | "contactRole" | "phone" | "email" | "linkedin" | "website"
  | "clientele" | "standing" | "offreExistante" | "actualite" | "qualification" | "canal" | "problematiques" | "signals" | "angle" | "angleDetail" | "notes";

export const FIELDS: FieldDef[] = [
  { key: "company", label: "Nom de l'entreprise", group: "ind" },
  { key: "sector", label: "Secteur précis", group: "ind" },
  { key: "city", label: "Ville / localisation", group: "ind" },
  { key: "size", label: "Taille (salariés, sites…)", group: "ind" },
  { key: "contactName", label: "Interlocuteur (prénom, nom)", group: "ind" },
  { key: "contactRole", label: "Fonction de l'interlocuteur", group: "ind" },
  { key: "phone", label: "Numéro direct", group: "coord" },
  { key: "email", label: "Email direct", group: "coord" },
  { key: "linkedin", label: "LinkedIn", group: "coord" },
  { key: "qualification", label: "Phrase de qualification", group: "coord", area: true },
  { key: "website", label: "Site internet", group: "util" },
  { key: "clientele", label: "Clientèle type", group: "util" },
  { key: "standing", label: "Gamme / standing", group: "util" },
  { key: "offreExistante", label: "Offre existante proche de la vôtre", group: "util" },
  { key: "actualite", label: "Actualité récente", group: "util", area: true },
  { key: "canal", label: "Canal préféré", group: "opt" },
  { key: "problematiques", label: "Problématiques glanées", group: "opt", area: true },
  { key: "signals", label: "Signaux d'achat", group: "pil", area: true },
  { key: "angle", label: "Angle commercial (résumé affiché dans le tableau)", group: "pil", area: true },
  { key: "angleDetail", label: "Argumentaire complet (repris dans les séquences : {argumentaire})", group: "pil", area: true },
  { key: "notes", label: "Notes", group: "pil", area: true },
];

const WEIGHTS: Partial<Record<ProspectTextKey, number>> = {
  company: 2, sector: 2, city: 2, size: 2, contactName: 2, contactRole: 2, website: 1, clientele: 1, standing: 1,
  offreExistante: 1, actualite: 1, phone: 1, email: 1, linkedin: 1, qualification: 2, canal: 1, problematiques: 1,
};

export type ProspectLike = Partial<Record<ProspectTextKey, string | null>> & {
  status?: string | null;
  priority?: string | null;
  relances?: number | null;
  firstContact?: string | null;
  lastContact?: string | null;
  nextFollowUp?: string | null;
  callBack?: string | null;
  lastCallAt?: string | null;
  qualif?: unknown;
  sequence?: unknown;
};

export const has = (v?: string | null) => !!v && v.trim() !== "" && !/^à enrichir/i.test(v.trim());
export const isEmail = (v?: string | null) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v ?? "").trim());

// ---------- Dates (jours AAAA-MM-JJ au fuseau de l'entreprise) ----------
export const TIMEZONE = "Europe/Paris";
export const todayISO = (d: Date = new Date()) => new Intl.DateTimeFormat("fr-CA", { timeZone: TIMEZONE }).format(d);
export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
export const fmtDay = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");

// ---------- Fiche ----------
export function completeness(p: ProspectLike) {
  let got = 0, total = 0;
  for (const [k, w] of Object.entries(WEIGHTS) as [ProspectTextKey, number][]) {
    total += w;
    if (has(p[k])) got += w;
  }
  return Math.round((got / total) * 100);
}

export type Qualif = { fw: string; v: Record<string, number> };
export function qualScore(q: unknown) {
  const qq = q as Qualif | null;
  if (!qq || !FRAMEWORKS[qq.fw]) return null;
  const items = FRAMEWORKS[qq.fw];
  const s = items.reduce((acc, i) => acc + (qq.v?.[i] ?? 0), 0);
  return Math.round((s / (items.length * 2)) * 100);
}

// ---------- Séquences ----------
export const DEFAULT_DELAYS = [3, 7, 12, 20, 30];
export const DEFAULT_LI_DELAYS = [7];
// Nombre de relances réglable par séquence.
export const MAX_RELANCES = 8;
export const MAX_LI_RELANCES = 5;

// Délais en jours après le J0, croissants ; à défaut, la séquence standard.
function cleanDelays(v: unknown, max: number) {
  if (!Array.isArray(v)) return null;
  const a = v.map(Number);
  return a.length <= max && a.every((n, i) => Number.isInteger(n) && n >= 1 && n <= 180 && (i === 0 || n > a[i - 1])) ? a : null;
}
export const tplDelays = (v: unknown): number[] => cleanDelays(v, MAX_RELANCES) ?? DEFAULT_DELAYS;
export const tplLiDelays = (v: unknown): number[] => cleanDelays(v, MAX_LI_RELANCES) ?? DEFAULT_LI_DELAYS;

export type SeqStep = { k: string; day: string; t: string; subj?: string; ch: "Email" | "LinkedIn" };
// Étapes d'une séquence : J0, N relances email, et LinkedIn en parallèle (invitation, message, M relances).
const liKey = (i: number) => (i === 1 ? "linkedinRelance" : `linkedinRelance${i}`);
export function seqSteps(delays: number[] = DEFAULT_DELAYS, liDelays: number[] = DEFAULT_LI_DELAYS): SeqStep[] {
  return [
    { k: "email", day: "J0", t: "Email à froid", subj: "emailObjet", ch: "Email" },
    ...delays.map((d, i): SeqStep => ({ k: `relance${i + 1}`, day: `J+${d}`, t: `Relance ${i + 1}${i === delays.length - 1 ? " (dernière)" : ""}`, subj: `relance${i + 1}Objet`, ch: "Email" })),
    { k: "linkedinInvitation", day: "J0", t: "Invitation (≤ 300 caractères)", ch: "LinkedIn" },
    { k: "linkedinMessage", day: "J+2", t: "Message après acceptation", ch: "LinkedIn" },
    ...liDelays.map((d, i): SeqStep => ({ k: liKey(i + 1), day: `J+${d}`, t: `Relance LinkedIn ${i + 1}`, ch: "LinkedIn" })),
  ];
}
const upTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
// Toutes les étapes possibles, pour retrouver une étape par sa clé.
export const SEQ_STEPS = seqSteps(upTo(MAX_RELANCES), upTo(MAX_LI_RELANCES));
export const TPL_KEYS = SEQ_STEPS.flatMap((s) => (s.subj ? [s.subj, s.k] : [s.k]));

export function stepDay(step: SeqStep, delays: number[], liDelays: number[] = DEFAULT_LI_DELAYS) {
  const m = /^relance(\d+)$/.exec(step.k);
  if (m) return `J+${delays[Number(m[1]) - 1] ?? "?"}`;
  const l = /^linkedinRelance(\d*)$/.exec(step.k);
  if (l) return `J+${liDelays[Number(l[1] || 1) - 1] ?? "?"}`;
  return step.day;
}

export const STANDARD_TEMPLATE = {
  name: "Séquence standard (à personnaliser)",
  delays: DEFAULT_DELAYS,
  liDelays: DEFAULT_LI_DELAYS,
  steps: {
    emailObjet: "{entreprise} : une idée pour votre équipe",
    email:
      "Bonjour {prenom},\n\n{argumentaire}\n\nSeriez-vous ouvert(e) à un échange de 15 minutes la semaine prochaine pour voir si cela s'applique à {entreprise} ?\n\nBelle journée,\n{signature}\n\nSi je ne m'adresse pas à la bonne personne ou si vous préférez ne plus être contacté(e), dites-le-moi simplement.",
    relance1Objet: "Re : {entreprise}",
    relance1:
      "Bonjour {prenom},\n\nJe me permets de revenir vers vous avec un élément concret : [cas client, chiffre ou ressource utile pour le secteur {secteur}].\n\nEst-ce un sujet pour {entreprise} en ce moment ?\n\n{signature}\n\nSi ce n'est pas le bon moment ou la bonne personne, dites-le-moi simplement.",
    relance2Objet: "Une question rapide, {prenom}",
    relance2: "Bonjour {prenom},\n\nUne seule question : comment {entreprise} gère-t-elle [le sujet] aujourd'hui ?\n\nSi c'est déjà bien couvert, je ne vous relancerai pas sur ce point.\n\n{signature}",
    relance3Objet: "Ressource pour {entreprise}",
    relance3:
      "Bonjour {prenom},\n\nJe vous partage [une ressource utile : guide, étude, checklist] sur [le sujet], pensée pour le secteur {secteur}. Elle peut vous servir même sans échange de notre part.\n\nSouhaitez-vous que je vous l'envoie ?\n\n{signature}",
    relance4Objet: "Ce qu'a obtenu [client similaire]",
    relance4:
      "Bonjour {prenom},\n\n[Client comparable] avait le même enjeu que {entreprise}. En [durée], il a obtenu [résultat chiffré].\n\n15 minutes pour voir si c'est transposable chez vous ?\n\n{signature}\n\nSi ce n'est pas le bon interlocuteur, dites-le-moi simplement.",
    relance5Objet: "Dernier message, {prenom}",
    relance5:
      "Bonjour {prenom},\n\nDernier message de ma part, je ne veux pas encombrer votre boîte. Si [le problème que vous résolvez] devient une priorité chez {entreprise}, je reste disponible pour en parler.\n\nBonne continuation,\n{signature}",
    linkedinInvitation:
      "Bonjour {prenom}, j'accompagne des entreprises du secteur {secteur} sur [votre sujet]. Votre rôle de {fonction} chez {entreprise} m'a donné envie d'échanger. Au plaisir de vous compter dans mon réseau.",
    linkedinMessage: "Merci pour la connexion, {prenom}. {phrase} Seriez-vous partant(e) pour un court échange ?",
    linkedinRelance:
      "{prenom}, je me permets de revenir vers vous ici : avez-vous pu jeter un œil à mon message ? Si le sujet n'est pas prioritaire pour {entreprise}, aucun souci, dites-le-moi simplement.",
  } as Record<string, string>,
};

// Signature d'un utilisateur : la sienne, sinon celle de l'équipe ({nom} = son nom), sinon son nom (sauf pour préremplir le formulaire).
export function effectiveSignature(user: { name: string; signature: string }, org: { defaultSignature: string }, fallbackName = true) {
  return user.signature || org.defaultSignature.replaceAll("{nom}", user.name) || (fallbackName ? user.name : "");
}

export function fillVars(txt: string | undefined, p: ProspectLike, signature: string) {
  const name = has(p.contactName) ? p.contactName!.trim() : "";
  const map: Record<string, string> = {
    entreprise: p.company ?? "",
    prenom: name.split(/\s+/)[0] ?? "",
    nom: name,
    fonction: p.contactRole ?? "",
    ville: p.city ?? "",
    secteur: p.sector ?? "",
    phrase: has(p.qualification) ? p.qualification! : "",
    angle: has(p.angle) ? p.angle! : "",
    argumentaire: has(p.angleDetail) ? p.angleDetail! : has(p.angle) ? p.angle! : "",
    signature,
  };
  return String(txt ?? "").replace(/\{(\w+)\}/g, (m, k: string) => (k in map ? (has(map[k]) ? map[k] : "[À compléter]") : m));
}

type Steps = Record<string, string>;
const asSteps = (v: unknown): Steps => (v && typeof v === "object" ? (v as Steps) : {});

// Texte d'une étape : la séquence personnalisée du prospect d'abord, sinon le modèle de sa recherche.
export function stepText(key: string, subjKey: string | undefined, p: ProspectLike, templateSteps: unknown, signature: string) {
  const own = asSteps(p.sequence), t = asSteps(templateSteps);
  const body = own[key] || fillVars(t[key], p, signature);
  const subject = subjKey ? own[subjKey] || fillVars(t[subjKey], p, signature) : "";
  return { subject, body };
}

export const canRelance = (p: ProspectLike, max = MAX_RELANCES) => ["Contacté", "Relancé"].includes(p.status ?? "") && (p.relances ?? 0) < max;

export function dueState(p: ProspectLike, today = todayISO()) {
  if (!p.nextFollowUp || !["Contacté", "Relancé"].includes(p.status ?? "")) return null;
  if (p.nextFollowUp < today) return "late";
  if (p.nextFollowUp === today) return "today";
  return "later";
}
export const isDue = (p: ProspectLike, today = todayISO()) => canRelance(p) && ["late", "today"].includes(dueState(p, today) ?? "");

// Champs à mettre à jour quand le statut change : programme automatiquement les relances.
export function statusPatch(p: ProspectLike, status: string, delays: number[], today = todayISO()) {
  const patch: { status: string; firstContact?: string; lastContact?: string; nextFollowUp?: string | null; relances?: number; rdvDay?: string; wonDay?: string } = { status };
  // Jours de passage en RDV et de gain, pour le rapport hebdomadaire.
  if (status === "RDV planifié" && p.status !== status) patch.rdvDay = today;
  if (status === "Gagné" && p.status !== status) patch.wonDay = today;
  if (status === "Contacté") {
    patch.firstContact = p.firstContact ?? today;
    patch.lastContact = today;
    patch.relances = 0;
    patch.nextFollowUp = delays.length ? addDays(patch.firstContact, delays[0]) : null;
  } else if (status === "Relancé") {
    const first = p.firstContact ?? today;
    const k = (p.relances ?? 0) + 1;
    patch.relances = k;
    patch.firstContact = first;
    patch.lastContact = today;
    if (k < delays.length) {
      const planned = addDays(first, delays[k]);
      patch.nextFollowUp = planned > today ? planned : addDays(today, Math.max(1, delays[k] - delays[k - 1]));
    } else patch.nextFollowUp = null;
  } else {
    patch.nextFollowUp = null;
    if (status !== "À contacter") patch.lastContact = p.lastContact ?? today;
  }
  return patch;
}

export function stats(list: ProspectLike[], today = todayISO()) {
  const n = list.length;
  const by = (s: string) => list.filter((p) => p.status === s).length;
  const contacted = list.filter((p) => p.status && p.status !== "À contacter").length;
  const replied = by("A répondu") + by("RDV planifié") + by("Gagné");
  const rdv = by("RDV planifié") + by("Gagné");
  const won = by("Gagné");
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  return {
    n, contacted, replied, rdv, won,
    emails: list.filter((p) => isEmail(p.email)).length,
    enriched: list.filter((p) => completeness(p) >= 75).length,
    late: list.filter((p) => dueState(p, today) === "late").length,
    due: list.filter((p) => isDue(p, today)).length,
    toStart: list.filter((p) => (p.status ?? "À contacter") === "À contacter").length,
    rReply: pct(replied, contacted),
    rRdv: pct(rdv, contacted),
    rConv: pct(won, rdv),
  };
}

// ---------- Appels ----------
export const isCallable = (p: ProspectLike) => has(p.phone) && !["Gagné", "Perdu"].includes(p.status ?? "");
export const callBackDue = (p: ProspectLike, today = todayISO()) => !!p.callBack && p.callBack <= today;

// Ordre de la file : rappels prévus, prospects qui ont répondu, puis déjà relancés par email, puis nouveaux.
// Un prospect déjà appelé aujourd'hui (sans rappel prévu) passe en fin de file.
export function callRank(p: ProspectLike, today = todayISO()) {
  let r = callBackDue(p, today) ? 0
    : p.status === "A répondu" ? 1
    : ["Contacté", "Relancé"].includes(p.status ?? "") ? 2
    : p.status === "RDV planifié" ? 6
    : 3;
  if (p.lastCallAt === today && !callBackDue(p, today)) r += 10;
  return r + ({ A: 0, B: 0.3, C: 0.6 }[p.priority ?? "C"] ?? 0.6);
}

export function callQueue<T extends ProspectLike>(list: T[], today = todayISO()) {
  return list.filter(isCallable).sort((a, b) => callRank(a, today) - callRank(b, today));
}

// ---------- Import / export CSV ----------
export const CSV_COLS: (ProspectTextKey | "siren" | "priority" | "status" | "nextFollowUp")[] = [
  "company", "siren", "sector", "city", "size", "contactName", "contactRole", "phone", "email", "linkedin", "website",
  "qualification", "priority", "status", "nextFollowUp", "signals", "angle", "angleDetail", "canal", "actualite", "notes",
];
export const CSV_HEAD: Record<string, string> = {
  company: "Entreprise", siren: "SIREN", sector: "Secteur", city: "Ville", size: "Taille", contactName: "Interlocuteur", contactRole: "Fonction",
  phone: "Téléphone direct", email: "Email", linkedin: "LinkedIn", website: "Site web", qualification: "Phrase de qualification",
  priority: "Priorité", status: "Statut", nextFollowUp: "Prochaine relance", signals: "Signaux d'achat", angle: "Angle commercial",
  canal: "Canal", actualite: "Actualité", notes: "Notes",
};

export function toCSV(rows: ProspectLike[]) {
  const q = (v: unknown) => {
    const s = String(v ?? "");
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [CSV_COLS.map((c) => CSV_HEAD[c]).join(";")].concat(
    rows.map((p) => CSV_COLS.map((c) => (c === "priority" ? PRIO[p.priority ?? ""] ?? "" : q((p as Record<string, unknown>)[c]))).join(";")),
  );
  return "﻿" + lines.join("\r\n");
}

export function parseCSV(text: string) {
  text = text.replace(/^﻿/, "");
  const first = text.split(/\r?\n/)[0] ?? "";
  const count = (ch: string) => first.split(ch).length - 1;
  const sep = count("\t") > count(";") && count("\t") > count(",") ? "\t" : count(";") >= count(",") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cur = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === sep) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); rows.push(row); row = []; cur = "";
    } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");

// Transforme des lignes CSV (avec en-têtes) en prospects à créer.
export function rowsToProspects(rows: string[][]) {
  const [head, ...data] = rows;
  if (!head) return [];
  const map: Record<string, string> = {};
  for (const c of CSV_COLS) { map[norm(CSV_HEAD[c])] = c; map[norm(c)] = c; }
  Object.assign(map, {
    nom: "company", societe: "company", entreprise: "company", contact: "contactName", poste: "contactRole",
    telephone: "phone", tel: "phone", mail: "email", siteweb: "website", site: "website", localisation: "city",
    priorite: "priority", angledapproche: "angle",
  });
  const cols = head.map((h) => map[norm(h)]);
  return data
    .map((r) => {
      const o: Record<string, string> = {};
      cols.forEach((c, i) => { if (c && r[i]?.trim()) o[c] = r[i].trim(); });
      const pr = (o.priority ?? "").toLowerCase();
      o.priority = pr.startsWith("h") || pr === "a" ? "A" : pr.startsWith("bas") || pr === "c" ? "C" : "B";
      if (!STATUSES.includes(o.status as Status)) o.status = "À contacter";
      return o;
    })
    .filter((o) => o.company);
}
