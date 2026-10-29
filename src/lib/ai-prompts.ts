import { FIELDS, has, type ProspectLike } from "./prospecting";

type SearchLike = {
  name: string; geo: string; secteur: string; ca: string; salaries: string; motifs: string; activite: string;
  prix: string; diff: string; fonctions: string; volume: string; ton: string; notes: string;
};

// Ce que l'IA doit savoir de l'offre et du ciblage d'une recherche.
export function searchBrief(s: SearchLike | null | undefined) {
  if (!s) return "Aucune recherche associée : offre et ciblage non renseignés.";
  const rows: [string, string][] = [
    ["Recherche", s.name], ["Zone", s.geo], ["Secteur ciblé", s.secteur], ["CA visé", s.ca], ["Salariés", s.salaries],
    ["Motif de prospection", s.motifs], ["Activité / offre", s.activite], ["Prix", s.prix], ["Différenciation", s.diff],
    ["Fonctions à viser", s.fonctions], ["Ton et langue", s.ton], ["Notes", s.notes],
  ];
  return rows.filter(([, v]) => v?.trim()).map(([k, v]) => `${k} : ${v}`).join("\n");
}

// Fiche prospect réduite aux champs renseignés.
export function prospectBrief(p: ProspectLike) {
  return FIELDS.filter((f) => has(p[f.key])).map((f) => `${f.label} : ${String(p[f.key]).trim().slice(0, 300)}`).join(" ; ") || "fiche presque vide";
}
