// Priorité A / B / C des prospects trouvés par la recherche automatique.
import { has, isEmail } from "./prospecting";

type Scored = { contactRole: string; email: string; emailVerified: boolean; phone: string; linkedin: string; contactName: string };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const DECIDERS = /(president|gerant|directeur general|dirigeant|fondateur|ceo|founder|owner|associe|pdg|managing)/;

export const functionList = (fonctions: string) => fonctions.split(/[,;\n]+/).map((f) => f.trim()).filter((f) => f.length > 1).slice(0, 20);

// Poste visé par la recherche (au moins un mot significatif en commun), ou décideur à défaut.
export function roleMatch(role: string, fonctions: string) {
  const r = norm(role);
  if (!r) return 0;
  const hit = functionList(fonctions).some((f) => norm(f).split(/\s+/).filter((w) => w.length > 3).some((w) => r.includes(w)));
  return hit ? 2 : DECIDERS.test(r) ? 1 : 0;
}

// Points : poste (0-4), email (vérifié 3, sinon 1), téléphone 2, LinkedIn 1, nom du contact 1.
export function priorityFor(p: Scored, fonctions: string) {
  const score =
    roleMatch(p.contactRole, fonctions) * 2 +
    (isEmail(p.email) ? (p.emailVerified ? 3 : 1) : 0) +
    (has(p.phone) ? 2 : 0) +
    (has(p.linkedin) ? 1 : 0) +
    (has(p.contactName) ? 1 : 0);
  return score >= 7 ? "A" : score >= 3 ? "B" : "C";
}
