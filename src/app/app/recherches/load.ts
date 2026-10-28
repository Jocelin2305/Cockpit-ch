import { db } from "@/lib/db";
import { tplDelays } from "@/lib/prospecting";
import type { Preset, TemplateOption } from "./search-wizard";

const KEYS = ["geo", "secteur", "ca", "salaries", "motifs", "activite", "prix", "diff", "fonctions", "volume", "ton"] as const;

export async function wizardOptions(organizationId: string) {
  const [templates, searches] = await Promise.all([
    db.sequenceTemplate.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" }, include: { searches: { select: { name: true } } } }),
    db.search.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } }),
  ]);
  const templateOptions: TemplateOption[] = templates.map((t) => ({
    id: t.id, name: t.name, delays: tplDelays(t.delays), usedBy: t.searches.map((s) => s.name),
  }));
  const presets: Preset[] = searches.map((s) => ({
    id: s.id,
    label: "Recherche précédente",
    name: s.name,
    data: Object.fromEntries(KEYS.map((k) => [k, s[k]])),
    templateId: s.templateId,
  }));
  return { templateOptions, presets };
}
