// Référentiels de la recherche automatique (codes INSEE), sans dépendance serveur.

export const REGIONS: [string, string][] = [
  ["84", "Auvergne-Rhône-Alpes"], ["27", "Bourgogne-Franche-Comté"], ["53", "Bretagne"], ["24", "Centre-Val de Loire"],
  ["94", "Corse"], ["44", "Grand Est"], ["32", "Hauts-de-France"], ["11", "Île-de-France"], ["28", "Normandie"],
  ["75", "Nouvelle-Aquitaine"], ["76", "Occitanie"], ["52", "Pays de la Loire"], ["93", "Provence-Alpes-Côte d'Azur"],
  ["01", "Guadeloupe"], ["02", "Martinique"], ["03", "Guyane"], ["04", "La Réunion"], ["06", "Mayotte"],
];

// Sections de la nomenclature d'activités (NAF).
export const SECTIONS: [string, string][] = [
  ["A", "Agriculture, sylviculture, pêche"], ["B", "Industries extractives"], ["C", "Industrie manufacturière"],
  ["D", "Énergie (électricité, gaz)"], ["E", "Eau, déchets, dépollution"], ["F", "Construction, BTP"],
  ["G", "Commerce, réparation auto"], ["H", "Transports et entreposage"], ["I", "Hébergement et restauration"],
  ["J", "Information et communication"], ["K", "Finance et assurance"], ["L", "Immobilier"],
  ["M", "Conseil, services scientifiques et techniques"], ["N", "Services administratifs et de soutien"],
  ["O", "Administration publique"], ["P", "Enseignement"], ["Q", "Santé humaine et action sociale"],
  ["R", "Arts, spectacles, loisirs"], ["S", "Autres services"], ["T", "Ménages employeurs"], ["U", "Organisations extraterritoriales"],
];

// Tranches d'effectif salarié (codes INSEE).
export const EFFECTIFS: [string, string][] = [
  ["01", "1-2"], ["02", "3-5"], ["03", "6-9"], ["11", "10-19"], ["12", "20-49"], ["21", "50-99"], ["22", "100-199"],
  ["31", "200-249"], ["32", "250-499"], ["41", "500-999"], ["42", "1 000-1 999"], ["51", "2 000-4 999"], ["52", "5 000-9 999"], ["53", "10 000 +"],
];
export const effectifLabel = (code: string | null | undefined) => {
  const e = EFFECTIFS.find(([c]) => c === code);
  return e ? `${e[1]} salariés` : "";
};
export const sectionLabel = (code: string | null | undefined) => SECTIONS.find(([c]) => c === code)?.[1] ?? "";

// Liste saisie (« 69, 38 ; 01 ») → codes nettoyés.
export const codes = (v: string) => v.split(/[\s,;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);

// Résumé des critères de la recherche automatique.
type Ciblage = Partial<Record<"srcRegion" | "srcDeps" | "srcSection" | "srcNaf" | "srcKeyword" | "srcEffectifs" | "srcCaMin" | "srcCaMax", string>>;
export const ciblageLabel = (d: Ciblage) =>
  [
    REGIONS.find(([c]) => c === d.srcRegion)?.[1],
    d.srcDeps && `dép. ${codes(d.srcDeps).join(", ")}`,
    SECTIONS.find(([c]) => c === d.srcSection)?.[1],
    d.srcNaf && `NAF ${codes(d.srcNaf).join(", ")}`,
    d.srcKeyword && `« ${d.srcKeyword} »`,
    d.srcEffectifs && `${codes(d.srcEffectifs).map((c) => EFFECTIFS.find(([k]) => k === c)?.[1]).filter(Boolean).join(", ")} salariés`,
    (d.srcCaMin || d.srcCaMax) && `CA ${d.srcCaMin || "0"} à ${d.srcCaMax || "∞"} €`,
  ].filter(Boolean).join(" · ");
