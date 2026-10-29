import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { db } from "./db";
import { delaysFor, ownedSearchId } from "./cockpit";
import { generateAnglesFor } from "./ai-features";
import {
  canRelance, FIELDS, has, isDue, SEQ_STEPS, STATUSES, stats, statusPatch, stepText, todayISO,
} from "./prospecting";

export const ASSISTANT_RULES = `
Tu es le Copilote IA de Cockpit'ch. Tu agis directement dans l'outil grâce aux outils fournis : lister, lire, ajouter et modifier des prospects, marquer une étape email comme faite, rédiger des angles commerciaux.
Quand l'utilisateur demande une action, fais-la avec les outils, puis confirme en une phrase ce qui a été fait. N'ajoute que les informations qu'il a données : les coordonnées non fournies restent vides. Avant de modifier plus de 5 prospects d'un coup, demande confirmation.
L'outil n'envoie pas encore d'emails lui-même : pour un email ou une relance, donne le texte prêt à copier (outil lire_fiche) et propose de marquer l'étape comme faite une fois l'email envoyé. Ne marque jamais une étape faite sans que l'utilisateur l'ait confirmé.
Tu ne navigues pas sur le web : pour trouver de nouvelles entreprises réelles, renvoie vers le bouton « Prompt de sourcing » ou l'import CSV d'une recherche.
Format : Markdown concis. Pour une demande de stratégie ou de plan, utilise ces sections en titres « ## » : Analyse, Opportunités identifiées, Recommandation stratégique, Plan d'action, Messages proposés, KPI à suivre, Prochaine expérimentation. Pour une question courte, réponds brièvement.`;

export type AssistantCtx = { organizationId: string; userId: string; signature: string };

// Contexte du jour, placé après la partie stable du prompt pour ne pas casser le cache.
export async function assistantContext(ctx: AssistantCtx, orgName: string, userName: string, role: string) {
  const [searches, prospects] = await Promise.all([
    db.search.findMany({ where: { organizationId: ctx.organizationId }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
    db.prospect.findMany({ where: { organizationId: ctx.organizationId }, select: { status: true, relances: true, nextFollowUp: true, email: true, angle: true, searchId: true } }),
  ]);
  const today = todayISO();
  const st = stats(prospects, today);
  return `Contexte : entreprise « ${orgName} », utilisateur ${userName} (${role}), date du jour ${today}.
Chiffres : ${st.n} prospects, ${st.contacted} contactés, ${st.replied} réponses, ${st.rdv} RDV, ${st.won} gagnés, ${st.due} relances dues, ${st.toStart} à contacter, ${prospects.filter((p) => !has(p.angle)).length} sans angle.
Recherches (id | nom) :
${searches.map((s) => `${s.id} | ${s.name}`).join("\n") || "aucune"}`;
}

const fieldShape = Object.fromEntries(
  FIELDS.filter((f) => f.key !== "company").map((f) => [f.key, z.string().optional().describe(f.label)]),
) as Record<string, z.ZodOptional<z.ZodString>>;

const clean = (o: Record<string, string | undefined> | undefined) =>
  Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => typeof v === "string").map(([k, v]) => [k, v!.trim().slice(0, 5000)]));

// Outils de l'assistant : chacun est limité à l'entreprise de l'utilisateur connecté.
export function assistantTools(ctx: AssistantCtx, onAction: (label: string) => void) {
  const org = ctx.organizationId;
  const find = async (id: string) => {
    const p = await db.prospect.findFirst({ where: { id, organizationId: org }, include: { search: { include: { template: true } } } });
    if (!p) throw new Error(`Aucun prospect avec l'id ${id}.`);
    return p;
  };

  return [
    betaZodTool({
      name: "lister_prospects",
      description: "Liste les prospects (id, entreprise, fonction, priorité, statut, prochaine relance, angle). Filtres facultatifs : recherche, statut, relances dues aujourd'hui, texte. 80 résultats maximum.",
      inputSchema: z.object({
        rechercheId: z.string().optional(),
        statut: z.enum(STATUSES).optional(),
        relancesDues: z.boolean().optional(),
        texte: z.string().optional(),
      }),
      run: async (i) => {
        const today = todayISO();
        const rows = await db.prospect.findMany({
          where: {
            organizationId: org,
            ...(i.rechercheId ? { searchId: i.rechercheId } : {}),
            ...(i.statut ? { status: i.statut } : {}),
            ...(i.texte ? { OR: [{ company: { contains: i.texte, mode: "insensitive" } }, { contactName: { contains: i.texte, mode: "insensitive" } }, { city: { contains: i.texte, mode: "insensitive" } }] } : {}),
          },
          take: 500,
        });
        const all = rows.filter((p) => !i.relancesDues || isDue(p, today));
        const list = all.slice(0, 30);
        return JSON.stringify({
          total: all.length,
          ...(all.length > list.length ? { note: "30 premiers affichés : précisez un filtre pour voir les autres." } : {}),
          prospects: list.map((p) => ({
            id: p.id, entreprise: p.company, fonction: p.contactRole || undefined, priorite: p.priority, statut: p.status,
            relance: p.nextFollowUp || undefined, relancesFaites: p.relances || undefined, angle: p.angle || undefined,
          })),
        });
      },
    }),
    betaZodTool({
      name: "lire_fiche",
      description: "Renvoie la fiche complète d'un prospect et le texte de sa prochaine étape email (objet et message prêts à copier).",
      inputSchema: z.object({ id: z.string() }),
      run: async ({ id }) => {
        const p = await find(id);
        const key = p.status === "À contacter" ? "email" : canRelance(p) ? `relance${p.relances + 1}` : null;
        const step = SEQ_STEPS.find((s) => s.k === key);
        const next = step ? stepText(step.k, step.subj, p, p.search?.template?.steps, ctx.signature) : null;
        return JSON.stringify({
          ...Object.fromEntries(FIELDS.filter((f) => has(p[f.key])).map((f) => [f.key, String(p[f.key]).slice(0, 1500)])),
          priorite: p.priority, statut: p.status, relancesFaites: p.relances, prochaineRelance: p.nextFollowUp,
          recherche: p.search?.name ?? null,
          prochaineEtape: step && next ? { etape: step.t, objet: next.subject, message: next.body } : "séquence email terminée",
        });
      },
    }),
    betaZodTool({
      name: "ajouter_prospect",
      description: "Crée un prospect avec les informations données par l'utilisateur. Renvoie son id.",
      inputSchema: z.object({
        company: z.string().describe("Nom de l'entreprise"),
        ...fieldShape,
        priority: z.enum(["A", "B", "C"]).optional().describe("A haute, B moyenne, C basse"),
        rechercheId: z.string().optional(),
      }),
      run: async (i) => {
        const { company, priority, rechercheId, ...rest } = i;
        if (!company.trim()) throw new Error("Le nom de l'entreprise est obligatoire.");
        const p = await db.prospect.create({
          data: {
            ...clean(rest as Record<string, string | undefined>),
            company: company.trim().slice(0, 200),
            priority: priority ?? "B",
            organizationId: org,
            searchId: await ownedSearchId(org, rechercheId),
          },
        });
        onAction(`Ajouté : ${p.company}`);
        return JSON.stringify({ id: p.id });
      },
    }),
    betaZodTool({
      name: "modifier_prospect",
      description: "Met à jour les champs d'un prospect et/ou son statut. Changer le statut programme automatiquement les relances (Contacté → relance 1, etc.).",
      inputSchema: z.object({
        id: z.string(),
        champs: z.object({ company: z.string().optional(), ...fieldShape, priority: z.enum(["A", "B", "C"]).optional() }).optional(),
        statut: z.enum(STATUSES).optional(),
      }),
      run: async ({ id, champs, statut }) => {
        const p = await find(id);
        const data: Record<string, unknown> = clean(champs as Record<string, string | undefined>);
        if (statut) Object.assign(data, statusPatch(p, statut, await delaysFor(org, p.searchId)));
        await db.prospect.update({ where: { id }, data });
        onAction(`Mis à jour : ${p.company}${statut ? ` → ${statut}` : ""}`);
        return JSON.stringify({ ok: true, statut: (data.status as string) ?? p.status });
      },
    }),
    betaZodTool({
      name: "etape_email_faite",
      description: "Marque l'email J0 ou la relance due comme envoyé(e), après confirmation de l'utilisateur : met à jour le statut et programme la relance suivante.",
      inputSchema: z.object({ id: z.string() }),
      run: async ({ id }) => {
        const p = await find(id);
        const next = p.status === "À contacter" ? "Contacté" : "Relancé";
        const patch = statusPatch(p, next, await delaysFor(org, p.searchId));
        await db.prospect.update({ where: { id }, data: patch });
        onAction(`${p.company} → ${next}`);
        return JSON.stringify({ statut: next, prochaineRelance: patch.nextFollowUp ?? null });
      },
    }),
    betaZodTool({
      name: "generer_angles",
      description: "Rédige l'angle commercial des prospects qui n'en ont pas (un prospect, une recherche, ou tous si rien n'est précisé). Renvoie le nombre d'angles ajoutés.",
      inputSchema: z.object({ prospectId: z.string().optional(), rechercheId: z.string().optional() }),
      run: async (i) => {
        const res = await generateAnglesFor(ctx, { prospectId: i.prospectId, searchId: i.rechercheId });
        onAction(`${res.count} angle(s) rédigé(s)`);
        return JSON.stringify(res);
      },
    }),
  ];
}
