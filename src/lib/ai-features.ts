import { z } from "zod";
import { db } from "./db";
import { generateJSON, generateText, type AiContext } from "./ai";
import { prospectBrief, searchBrief } from "./ai-prompts";
import { has, isDue, stats, TPL_KEYS, tplDelays, todayISO } from "./prospecting";

const BATCH = 20;
const MAX_ANGLES = 100;

const AnglesSchema = z.object({ angles: z.array(z.object({ id: z.string(), angle: z.string() })) });

// Rédige l'angle commercial des prospects qui n'en ont pas encore (par lots de 20, 100 au maximum).
export async function generateAnglesFor(ctx: AiContext, where: { prospectId?: string; searchId?: string }) {
  const prospects = await db.prospect.findMany({
    where: {
      organizationId: ctx.organizationId,
      angle: "",
      status: { notIn: ["Gagné", "Perdu"] },
      ...(where.prospectId ? { id: where.prospectId } : {}),
      ...(where.searchId ? { searchId: where.searchId } : {}),
    },
    include: { search: true },
    take: MAX_ANGLES,
  });
  let count = 0;
  for (let i = 0; i < prospects.length; i += BATCH) {
    const batch = prospects.slice(i, i + BATCH);
    const searches = [...new Map(batch.filter((p) => p.search).map((p) => [p.search!.id, p.search!])).values()];
    const briefs = searches.map((s) => `### Recherche ${s.id}\n${searchBrief(s)}`).join("\n\n");
    const result = await generateJSON(
      ctx,
      "angles",
      AnglesSchema,
      `Pour chaque prospect ci-dessous, rédige son angle commercial : 1 à 2 phrases concrètes qui relient ce qu'on sait du prospect à l'offre du vendeur (douleur probable et accroche à utiliser au premier contact).

Offre et ciblage du vendeur, par recherche :
${briefs || "Aucune recherche renseignée : reste prudent et préfixe par « (déduction) »."}

Prospects :
${batch.map((p) => `- id ${p.id} | recherche ${p.searchId ?? "aucune"} | ${prospectBrief(p)}`).join("\n")}

Renvoie un angle par prospect, avec son id exact.`,
      "low",
    );
    const ids = new Set(batch.map((p) => p.id));
    for (const a of result.angles) {
      if (!ids.has(a.id) || !a.angle.trim()) continue;
      const res = await db.prospect.updateMany({
        where: { id: a.id, organizationId: ctx.organizationId, angle: "" },
        data: { angle: a.angle.trim().slice(0, 2000) },
      });
      count += res.count;
    }
  }
  return { count, remaining: Math.max(0, prospects.length - count) };
}

const StepsSchema = z.object(Object.fromEntries(TPL_KEYS.map((k) => [k, z.string()])) as Record<string, z.ZodString>);

// Rédige un modèle de séquence (5 relances email + LinkedIn en parallèle) à partir des critères d'une recherche.
export async function generateTemplateSteps(ctx: AiContext, search: Parameters<typeof searchBrief>[0], delays: number[]) {
  const steps = await generateJSON(
    ctx,
    "sequence",
    StepsSchema,
    `Rédige un MODÈLE de séquence de prospection réutilisable pour toute une liste de prospects.
Utilise uniquement ces variables entre accolades : {prenom} {fonction} {entreprise} {ville} {secteur} {phrase} {signature}. {phrase} est la phrase de qualification propre à chaque prospect (fait vérifiable + bénéfice) : place-la là où la personnalisation compte. N'invente aucun fait sur une entreprise.
Emails : 110 mots maximum, une seule demande claire, une ligne de désinscription simple à la fin de chaque email. Cinq relances aux jours J+${delays.join(", J+")} : chacune apporte un élément nouveau (question, ressource utile, cas client, chiffre) sans répéter les précédentes ; la 5e est une clôture courtoise.
LinkedIn en parallèle, sans script d'appel : invitation de 300 caractères maximum sans argumentaire, message court après acceptation, relance LinkedIn brève. Les messages LinkedIn complètent les emails sans les répéter.
Respecte le ton et la langue indiqués.

Offre et ciblage :
${searchBrief(search)}`,
    "medium",
  );
  return steps as Record<string, string>;
}

export const CallReportSchema = z.object({
  resume: z.string(),
  interet: z.enum(["fort", "moyen", "faible", "aucun"]),
  objections: z.array(z.string()),
  prochaineEtape: z.string(),
  statut: z.enum(["À contacter", "Contacté", "A répondu", "RDV planifié", "Gagné", "Perdu"]),
  rappelLe: z.string().nullable(),
  qualification: z.array(z.object({ critere: z.string(), niveau: z.number().int() })),
  infos: z.object({ contactName: z.string().nullable(), contactRole: z.string().nullable(), email: z.string().nullable(), notes: z.string().nullable() }),
});
export type CallReport = z.infer<typeof CallReportSchema>;

// Transforme une transcription ou des notes d'appel en compte rendu structuré.
export async function analyzeCallNotes(ctx: AiContext, prospect: Parameters<typeof prospectBrief>[0] & { status?: string | null }, notes: string, framework: string[]) {
  return generateJSON(
    ctx,
    "appel",
    CallReportSchema,
    `Voici la transcription ou les notes d'un appel de prospection. N'utilise que ce qui est dit dans le texte, n'invente rien. Date du jour : ${todayISO()}.

Fiche du prospect : ${prospectBrief(prospect)}
Statut avant l'appel : ${prospect.status ?? "À contacter"}

Transcription / notes :
"""
${notes.slice(0, 15000)}
"""

Consignes :
- resume : 3 phrases maximum.
- statut : le plus juste après cet appel.
- rappelLe : date AAAA-MM-JJ si un rappel est convenu ou utile, sinon null.
- qualification : pour chacun de ces critères (${framework.join(", ")}), niveau 0 inconnu, 1 partiel, 2 validé, d'après l'appel.
- infos : seulement ce qui est dit explicitement, sinon null.`,
    "low",
  );
}

// Analyse des résultats ou ciblage d'une recherche, en Markdown.
export async function analyzeSearch(ctx: AiContext, searchId: string, kind: "analyse" | "ciblage") {
  const search = await db.search.findFirst({ where: { id: searchId, organizationId: ctx.organizationId }, include: { prospects: true, template: true } });
  if (!search) return "Recherche introuvable.";
  if (kind === "ciblage") {
    return generateText(
      ctx,
      "ciblage",
      `Ne cite AUCUNE entreprise réelle : décris des types d'entreprises et des méthodes de sourcing. Challenge les critères s'ils te semblent discutables.

Recherche :
${searchBrief(search)}

Réponds en Markdown avec ces sections en titres « ## » : Profil client idéal (3 phrases, filtre de taille), Segments prioritaires (3, avec signaux d'achat et fonctions à viser), Requêtes de sourcing (6 requêtes Google ou LinkedIn Sales Navigator prêtes à copier), Signaux de risque. 300 mots maximum.`,
      "medium",
    );
  }
  const today = todayISO();
  const st = stats(search.prospects, today);
  const rows = search.prospects
    .slice(0, 60)
    .map((p) => `- ${p.company} | ${p.sector || "?"} | ${p.status} | relances ${p.relances}${isDue(p, today) ? " | relance due" : ""}${has(p.angle) ? "" : " | sans angle"}${has(p.email) ? "" : " | sans email"}`)
    .join("\n");
  return generateText(
    ctx,
    "analyse",
    `Analyse les résultats de cette recherche de prospection.

Recherche :
${searchBrief(search)}
Séquence : ${search.template ? `${search.template.name}, relances J+${tplDelays(search.template.delays).join(", J+")}` : "aucune"}
Chiffres : ${st.n} prospects, ${st.contacted} contactés, ${st.replied} réponses (${st.rReply} %), ${st.rdv} RDV (${st.rRdv} %), ${st.won} gagnés, ${st.emails} emails trouvés, ${st.late} relances en retard.
Prospects :
${rows || "aucun"}

Réponds en Markdown avec ces sections en titres « ## » : Analyse, Opportunités identifiées, Recommandation stratégique, Plan d'action (cette semaine), Messages proposés, KPI à suivre, Prochaine expérimentation (mesurable). Listes à puces, 350 mots maximum.`,
    "medium",
  );
}
